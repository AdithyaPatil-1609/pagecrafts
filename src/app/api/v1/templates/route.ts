import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ok } from "@/lib/errors/respond";
import { parseTemplateQuery, queryTemplates } from "@/lib/templates/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/templates — the gallery's query (screen 04, D6).
//
// Filters: category, colour, layout, feature, tier, q. Ordering: sort, plus the classifier's
// intent when the person described their site. Every unrecognised value is ignored rather
// than refused — a stale link is answered with a broader gallery, never an error (D-4).
//
// Open to signed-out visitors, like the design detail it pairs with: the library is public,
// read-only data, and putting a door in front of "look at the designs" would be a door in
// the middle of the funnel.
export const GET = withRoute({
    auth: "none",
    handler: async ({ req }) =>
        ok(queryTemplates(parseTemplateQuery(new URL(req.url).searchParams))),
});
