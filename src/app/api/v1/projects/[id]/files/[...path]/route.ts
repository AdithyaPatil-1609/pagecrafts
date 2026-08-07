import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { getProjectFile } from "@/lib/data/project-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string; path: string[] };

// GET /api/v1/projects/{id}/files/{path}
// The catch-all segment rebuilds nested paths: /files/sections/hero.html -> "sections/hero.html".
export const GET = withRoute<undefined, Params>({
  handler: async ({ supabase, params }) => {
    const path = (params.path ?? []).map(decodeURIComponent).join("/");
    return ok(await getProjectFile(supabase, params.id, path));
  },
});
