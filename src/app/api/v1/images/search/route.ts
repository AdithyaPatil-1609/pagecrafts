import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { fail, ok } from "@/lib/errors/respond";
import { MAX_QUERY_CHARS, searchImages } from "@/lib/images/unsplash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE = 20;

// GET /api/v1/images/search?q=&page= — the photo library the image slots open (S-1).
//
// Signed in only: it spends a shared third-party quota, and an open proxy to it is an open
// proxy to someone else's rate limit. The query arrives in the URL because it is a search,
// and there is nothing personal in it to keep out of one.
export const GET = withRoute({
  handler: async ({ req }) => {
    const params = new URL(req.url).searchParams;
    const query = (params.get("q") ?? "").trim();
    const page = Number(params.get("page") ?? "1");

    if (!query) {
      return fail("validation_failed", "Type what you are looking for.");
    }
    if (query.length > MAX_QUERY_CHARS) {
      return fail("validation_failed", `Keep the search under ${MAX_QUERY_CHARS} characters.`);
    }
    if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
      return fail("validation_failed", "That page does not exist.");
    }

    return ok(await searchImages(query, page));
  },
});
