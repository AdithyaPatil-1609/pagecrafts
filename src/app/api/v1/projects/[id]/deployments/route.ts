import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { listDeployments } from "@/lib/data/deployments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// GET /api/v1/projects/{id}/deployments — the publish history behind screen 02 (R3 D13).
//
// Owner-scoped by RLS, like every other project route: a project that is not the caller's
// simply has no rows, and an empty history is the honest answer rather than a refusal —
// a project nobody has published has none either.
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => ok({ items: await listDeployments(supabase, params.id) }),
});
