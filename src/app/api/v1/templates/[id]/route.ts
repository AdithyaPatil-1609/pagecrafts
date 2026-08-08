import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ApiError, ok } from "@/lib/errors/respond";
import { TEMPLATES } from "@/lib/templates";
import { toTemplateDetail } from "@/lib/templates/detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// GET /api/v1/templates/{id} — what the detail modal (screen 05) is drawn from.
//
// Open to signed-out visitors, like the gallery it opens from: choosing a design happens
// before anyone has an account, and asking someone to sign in to look at a design would put
// a door in the middle of the funnel. The library is public, read-only data — there is no
// row here that belongs to a user, so there is nothing for RLS to protect.
export const GET = withRoute<undefined, Params>({
    auth: "none",
    handler: async ({ params }) => {
        const template = TEMPLATES.find((t) => t.id === params.id);

        // Plain language, because this message can reach a person (UI Spec §7.18): a
        // stale link to a retired design is not their mistake to decode.
        if (!template) {
            throw new ApiError("not_found", "That design is not available any more.");
        }

        return ok(toTemplateDetail(template));
    },
});
