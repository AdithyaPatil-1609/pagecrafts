import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { putFileSchema } from "@/lib/contracts/schemas";
import { deleteProjectFile, getProjectFile, putProjectFile } from "@/lib/data/project-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string; path: string[] };
type PutBody = z.infer<typeof putFileSchema>;

// The catch-all segment rebuilds nested paths: /files/sections/hero.html -> "sections/hero.html".
function joinPath(segments: string[] | undefined): string {
  return (segments ?? []).map(decodeURIComponent).join("/");
}

// GET /api/v1/projects/{id}/files/{path}
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) =>
    ok(await getProjectFile(supabase, params.id, joinPath(params.path))),
});

// PUT /api/v1/projects/{id}/files/{path} — upsert one file (marks dirty; does not commit).
export const PUT = withRoute<PutBody, Params>({
  schema: putFileSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await putProjectFile(supabase, params.id, joinPath(params.path), body.content)),
});

// DELETE /api/v1/projects/{id}/files/{path}
export const DELETE = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) =>
    ok(await deleteProjectFile(supabase, params.id, joinPath(params.path))),
});
