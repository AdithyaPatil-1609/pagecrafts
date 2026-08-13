import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { getDeployment } from "@/lib/data/deployments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// GET /api/v1/deployments/{id} — how is that publish going? (R3 D15, NFR-117)
//
// Polled, not streamed: the contract settled on polling for this, and a publish reports
// through a database row rather than a live connection, so there is nothing to stream from.
//
// Owner-scoped by RLS through the caller's client — a deployment belonging to someone else
// is not found, never forbidden, because saying "forbidden" would confirm it exists.
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => ok(await getDeployment(supabase, params.id)),
});
