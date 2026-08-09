import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { restoreSchema } from "@/lib/contracts/schemas";
import { restoreProject } from "@/lib/data/restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };
type PostBody = z.infer<typeof restoreSchema>;

// POST /api/v1/projects/{id}/restore — put the working tree back to a chosen version.
//
// Additive (FR-075, BR-15): the older history stays exactly where it is, so a user who
// restores and then changes their mind can go forward again. Nothing here updates or
// deletes a commit — the table does not grant it.
//
// A version that carries no snapshot, or one belonging to someone else, is refused before
// a single file is written, so a failed restore leaves the editor's work untouched.
export const POST = withRoute<PostBody, Params>({
  schema: restoreSchema,
  handler: async ({ supabase, params, body }) =>
    ok(await restoreProject(supabase, params.id, body.sha)),
});
