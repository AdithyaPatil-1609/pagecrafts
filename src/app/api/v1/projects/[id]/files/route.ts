import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { putFilesSchema } from "@/lib/contracts/schemas";
import { getProjectFiles, putProjectFiles } from "@/lib/data/project-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };
type PutBody = z.infer<typeof putFilesSchema>;

// GET /api/v1/projects/{id}/files — the working tree.
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => ok(await getProjectFiles(supabase, params.id)),
});

// PUT /api/v1/projects/{id}/files — replace the working tree (marks dirty; does not commit).
export const PUT = withRoute<PutBody, Params>({
  schema: putFilesSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await putProjectFiles(supabase, params.id, body.files)),
});
