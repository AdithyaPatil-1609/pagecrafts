import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { listCommits } from "@/lib/data/commits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// GET /api/v1/projects/{id}/commits — the project's history, newest first.
//
// Read straight from the commit mirror, so opening the editor costs one indexed query and
// never a call into the Git layer (E-6). Owner-scoped by RLS: another user's project is
// not_found, not an empty history.
//
// POST (explicit save) and POST /restore land with the workspace Git work in D6 — they
// make the commit first and then call recordCommit() to mirror it. This route is only the
// read, which is the half the editor needs now.
export const GET = withRoute<undefined, Params>({
    handler: async ({ supabase, params }) => ok(await listCommits(supabase, params.id)),
});
