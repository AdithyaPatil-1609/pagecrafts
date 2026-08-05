import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { patchProjectSchema } from "@/lib/contracts/schemas";
import { deleteProject, getProject, patchProject } from "@/lib/data/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };
type PatchBody = z.infer<typeof patchProjectSchema>;

// GET /api/v1/projects/{id}
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => ok(await getProject(supabase, params.id)),
});

// PATCH /api/v1/projects/{id} — name, site_meta, form_endpoint (S-2, S-3, S-4).
export const PATCH = withRoute<PatchBody, Params>({
  schema: patchProjectSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await patchProject(supabase, params.id, body)),
});

// DELETE /api/v1/projects/{id} — removes our row only (C-12).
export const DELETE = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => {
    await deleteProject(supabase, params.id);
    return ok({ deleted: true });
  },
});
