import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { createCommitSchema } from "@/lib/contracts/schemas";
import { createCommit, listCommits } from "@/lib/data/commits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };
type PostBody = z.infer<typeof createCommitSchema>;

// GET /api/v1/projects/{id}/commits — the project's history, newest first.
//
// Read straight from the commit mirror, so opening the editor costs one indexed query and
// never a call into the Git layer (E-6). Owner-scoped by RLS: another user's project is
// not_found, not an empty history.
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => ok(await listCommits(supabase, params.id)),
});

// POST /api/v1/projects/{id}/commits — an explicit save point (R3 D6).
//
// Commits the tree that is stored, not whatever the browser is holding: the editor writes
// through PUT /files first, then asks for a save point. Saving an unchanged tree returns
// the existing sha and adds no row, so the history sidebar cannot fill with duplicates.
//
// POST /restore lands in D7 and is additive — it appends a commit that returns the tree to
// an older state, and never rewrites what came before.
export const POST = withRoute<PostBody, Params>({
  schema: createCommitSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await createCommit(supabase, params.id, body.message), 201),
});
