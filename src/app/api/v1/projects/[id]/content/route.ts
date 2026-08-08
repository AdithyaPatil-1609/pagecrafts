import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { patchContentSchema } from "@/lib/contracts/schemas";
import { patchProjectContent } from "@/lib/data/project-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };
type PatchBody = z.infer<typeof patchContentSchema>;

// PATCH /api/v1/projects/{id}/content — the content panel's write path (E-1).
// Ops land against content_json under the template's content_schema; invalid ops are 422
// and nothing is applied.
export const PATCH = withRoute<PatchBody, Params>({
  schema: patchContentSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await patchProjectContent(supabase, params.id, body.ops)),
});
