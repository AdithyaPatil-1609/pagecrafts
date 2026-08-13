import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok, ApiError } from "@/lib/errors/respond";
import { publishProject } from "@/lib/data/publish-project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// POST /api/v1/projects/{id}/publish — put this site on the internet (R3 D15).
//
// Answers 202 with a deployment id and nothing else. The provider work runs on after the
// response and reports into that row; the client polls GET /deployments/{id} (NFR-117).
// Holding the request open would mean a ninety-second wait that the platform would cut off
// before the site was ready, and a user staring at a spinner that means nothing.
//
// Everything that can be decided quickly is decided before the response: whether the
// project is theirs, whether publishing has been paid for (payment_required, Doc 22 P2/P3),
// and whether there is anything to publish at all.
export const POST = withRoute<undefined, Params>({
  handler: async ({ req, supabase, params, userId }) => {
    // Required by the contract, and load-bearing: it is what makes ten republishes produce
    // one site rather than ten (FR-087, NFR-031). A caller that omits it is asking for a
    // retry to be indistinguishable from a second publish, so the answer is no.
    const idempotencyKey = req.headers.get("Idempotency-Key")?.trim();

    if (!idempotencyKey) {
      throw new ApiError(
        "validation_failed",
        "This request needs an Idempotency-Key header.",
        "so a retry does not publish the site twice",
      );
    }
    if (idempotencyKey.length > 255) {
      throw new ApiError("validation_failed", "That Idempotency-Key is too long.");
    }

    return ok(await publishProject(supabase, userId, params.id, idempotencyKey), 202);
  },
});
