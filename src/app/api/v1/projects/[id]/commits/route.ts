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

// GET /api/v1/projects/{id}/commits — the version list, newest first.
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => ok(await listCommits(supabase, params.id)),
});

// POST /api/v1/projects/{id}/commits — explicit save point over the current tree.
export const POST = withRoute<PostBody, Params>({
  schema: createCommitSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await createCommit(supabase, params.id, body.message), 201),
});
