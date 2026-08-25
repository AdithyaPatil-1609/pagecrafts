import 'server-only';

import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { publishProject } from '@/lib/data/publish-project';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Direct Upload + DNS; hold the request until finish() so Vercel cannot freeze mid-push. */
export const maxDuration = 300;

type Params = { id: string };

const MAX_KEY_LENGTH = 255;

// POST /api/v1/projects/{id}/publish — 202 with a deployment id; the work runs after.
//
// Shaped after the generate route rather than invented: the client is given something to
// poll immediately, because provisioning, pushing and verifying together take far longer
// than a request should be held open for.
//
// The publish itself is publishProject() and this route is only the door. It used to be
// both: an inline copy of the whole sequence lived here, and publishProject — written on
// D15 with the entitlement gate, the site-id memory and the failure handling — was never
// called by anything (R3 D18).
//
// That was not a tidiness problem. The copy here passed `siteId: null` on every call, under
// a comment saying no column held it, so every republish provisioned a brand-new site and
// abandoned the last one: FR-087 says ten republishes produce one site, and this produced
// ten. The D17 work that keeps a subdomain across a failed attempt was in the function
// nothing ran, so it protected nobody.
//
// One publish path now. Anything that must be true of a publish is true of it once.
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

        return ok(await publishProject(supabase, userId, params.id, idempotencyKey), 202);
    },
});
