import 'server-only';

import { withRoute } from '@/lib/kernel/with-route';
import { ApiError } from '@/lib/errors/respond';
import { jobStore } from '@/lib/ai/jobs/store';
import type { JobEvent } from '@/lib/ai/jobs/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const POLL_MS = 250;
const MAX_MS = 120_000;

function frame(event: JobEvent): string {
    return `event: ${event.name}\ndata: ${JSON.stringify({ at: event.at, ...event.data })}\n\n`;
}

// GET /api/v1/jobs/{id}/stream — progress as SSE. A 40s wait shown as one spinner
// reads as broken; the same wait as a filling checklist reads as work.
// GET /jobs/{id} stays the fallback for proxies that block streaming.
export const GET = withRoute<undefined, Params>({
    auth: 'required',
    handler: async ({ params, userId }) => {
        const job = await jobStore().get(params.id);
        if (!job || job.userId !== userId) throw new ApiError('not_found', 'No such job.');

        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                const encoder = new TextEncoder();
                let sent = 0;
                const startedAt = Date.now();

                try {
                    for (;;) {
                        const current = await jobStore().get(params.id);
                        if (!current) break;

                        for (const event of current.events.slice(sent)) {
                            controller.enqueue(encoder.encode(frame(event)));
                        }
                        sent = current.events.length;

                        const finished = current.status === 'done' || current.status === 'failed';
                        if (finished || Date.now() - startedAt > MAX_MS) break;

                        await new Promise((r) => setTimeout(r, POLL_MS));
                    }
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'content-type': 'text/event-stream',
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
            },
        });
    },
});
