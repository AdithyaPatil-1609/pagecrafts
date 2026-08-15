import 'server-only';

import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { assertCanPublish } from '@/lib/data/entitlements';
import { projectPublishInputs } from '@/lib/deploy/publishable';
import { publish } from '@/lib/deploy/publish';
import { PublishError } from '@/lib/deploy/errors';
import { openDeployment, recordDeployment } from '@/lib/data/deployments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const MAX_KEY_LENGTH = 255;

// POST /api/v1/projects/{id}/publish — 202 with a deployment id; the work runs after.
//
// Shaped after the generate route rather than invented: the client is given something to
// poll immediately, because provisioning, pushing and verifying together take far longer
// than a request should be held open for.
export const POST = withRoute<undefined, Params>({
    auth: 'required',
    handler: async ({ params, userId, req, supabase }) => {
        const idempotencyKey = req.headers.get('idempotency-key')?.trim();

        // The spec makes this header required. Without it a retried publish — a double
        // click, a flaky connection — provisions a second site for the same project and
        // bills for it, so a missing key is refused rather than guessed at.
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

        // Ownership is settled here, before anything is charged for or provisioned: the
        // read is owner-scoped by RLS, so somebody else's project is not found.
        const inputs = await projectPublishInputs(supabase, params.id);

        if (inputs.files.length === 0) {
            throw new ApiError(
                'validation_failed',
                'There is nothing to publish yet. Generate or edit the site first.',
            );
        }

        await assertCanPublish(supabase, userId, params.id);

        // A publish already under way is handed back rather than joined by a second one.
        // runOnce() in the deploy layer only dedupes an identical key; two different keys
        // for one project would otherwise race each other onto the same subdomain.
        const running = await openDeployment(supabase, params.id);
        if (running) return ok({ deploymentId: running.id, status: 'pending' as const }, 202);

        const recorder = await recordDeployment(supabase, params.id);

        void publish(
            {
                projectId: params.id,
                projectName: inputs.projectName,
                files: inputs.files,
                // No column holds the provisioned site id yet, so every publish provisions
                // a fresh one. Noted for R3 — see the handover note for D14.
                siteId: null,
                idempotencyKey,
            },
            recorder.onState,
        )
            .then((result) =>
                recorder.finish({
                    state: result.state,
                    liveUrl: result.liveUrl,
                    commitSha: result.commitSha,
                    error: result.error,
                }),
            )
            .catch(async (err) => {
                // What lands in the row is the sentence a person reads on the dashboard, so
                // it must never be a stack trace or an opaque provider string. PublishError
                // already carries one; anything else gets a written fallback.
                const message =
                    err instanceof PublishError
                        ? err.message
                        : 'Publishing failed. Nothing you have made is lost — try again in a moment.';

                console.error('[publish]', params.id, err);

                await recorder
                    .finish({ state: 'failed', error: message })
                    .catch((writeErr) => console.error('[publish] record failure', writeErr));
            });

        return ok({ deploymentId: recorder.deploymentId, status: 'pending' as const }, 202);
    },
});
