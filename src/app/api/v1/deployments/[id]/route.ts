import 'server-only';

import type { DeploymentResponse, DeploymentState } from '@/lib/contracts';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { getDeployment } from '@/lib/data/deployments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

// The database tracks seven states so the dashboard can narrate progress; the contract
// exposes three, because a caller polling for an answer only needs "not yet", "done" or
// "it failed". Everything in between is still "not yet".
function reportedStatus(state: DeploymentState): DeploymentResponse['status'] {
    if (state === 'live') return 'live';
    if (state === 'failed') return 'failed';
    return 'pending';
}

// GET /api/v1/deployments/{id} — poll a publish attempt.
export const GET = withRoute<undefined, Params>({
    auth: 'required',
    handler: async ({ params, supabase }) => {
        const deployment = await getDeployment(supabase, params.id);

        // Another account's deployment is not_found, never forbidden — the same rule the
        // jobs route follows. "Forbidden" would confirm the id is real to someone guessing.
        if (!deployment) {
            throw new ApiError('not_found', 'No such deployment.');
        }

        return ok<DeploymentResponse>({
            status: reportedStatus(deployment.state),
            repoUrl: deployment.repoUrl,
            liveUrl: deployment.liveUrl,
            commitSha: deployment.commitSha,
            error: deployment.error,
        });
    },
});
