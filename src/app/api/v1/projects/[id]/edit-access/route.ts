import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// GET /api/v1/projects/{id}/edit-access — edit-unlock paywall removed; always allowed.
export const GET = withRoute<undefined, Params>({
  auth: "required",
  handler: async () => {
    return ok({
      allowed: true,
      reason: "editing_free",
      unlockPriceInr: 0,
    });
  },
});

