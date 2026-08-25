import 'server-only';

import { after } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { publishProject } from '@/lib/data/publish-project';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Direct Upload + DNS after the 202; keep the isolate alive for the full push. */
export const maxDuration = 300;

type Params = { id: string };

const MAX_KEY_LENGTH = 255;

// POST /api/v1/projects/{id}/publish — 202 with a deployment id; the work runs after.
export const POST = withRoute<undefined, Params>({
    auth: 'required',
    handler: async ({ params, userId, req, supabase }) => {
        const idempotencyKey = req.headers.get('idempotency-key')?.trim();

        if (!idempotencyKey) {
            throw new ApiError(
                'validation_failed',
                'This request needs an Idempotency-Key header so a retry cannot publish twice.',
            );
        }

        if (idempotencyKey.length > MAX_KEY_LENGTH) {
            throw new ApiError(
                'validation_failed',
                `That Idempotency-Key is too long — it must be ${MAX_KEY_LENGTH} characters or fewer.`,
            );
        }

        const { background, ...body } = await publishProject(
            supabase,
            userId,
            params.id,
            idempotencyKey,
        );

        // Schedule from the route (request context). Nested `after()` inside publishProject
        // was not enough on Vercel — the isolate froze and left empty Pages projects.
        if (background) {
            waitUntil(background);
            after(async () => {
                await background;
            });
        }

        return ok(body, 202);
    },
});
