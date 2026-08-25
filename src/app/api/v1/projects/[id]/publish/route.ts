import 'server-only';

import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { publishProject } from '@/lib/data/publish-project';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/**
 * Hold the request open for the full Direct Upload + DNS path.
 * Detached waitUntil/after froze mid-upload on Vercel and left empty Pages
 * projects (522) while the UI polled a dead deployment row for minutes.
 */
export const maxDuration = 300;

type Params = { id: string };

const MAX_KEY_LENGTH = 255;

// POST /api/v1/projects/{id}/publish — runs the host work in-request, then 202.
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

        // Finish before answering. The client polls the deployment row; that only
        // works if this isolate actually completed push + DNS (or wrote failed).
        if (background) {
            await background;
        }

        return ok(body, 202);
    },
});
