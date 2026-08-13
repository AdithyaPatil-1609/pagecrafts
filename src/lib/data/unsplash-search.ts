import { serverEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/errors/respond";

// Photo search for the asset picker (R2 D12).
//
// The search runs here rather than in the browser for the same reason the download already
// does (S-1): UNSPLASH_ACCESS_KEY is a server secret, and a key shipped to the client is a
// key anybody can read out of the network tab and spend. The browser sends a word; the
// server sends back pictures.
//
// What comes back is deliberately small — an id, a thumbnail and the credit. Not the full
// Unsplash payload, which carries a hundred fields the picker has no use for and would
// leak our request shape into the client if it ever changed.

export interface PhotoResult {
    /** Unsplash's id, which is what POST /assets takes to fetch the real file. */
    id: string;
    /** A small preview, for the grid. Never the file that gets published. */
    thumbUrl: string;
    /** The photo's own alt text where it has one — for the grid's accessibility. */
    description: string;
    /** Who took it. Rendering this is a licence condition, not a courtesy. */
    credit: { name: string; link: string };
}

interface UnsplashSearchResponse {
    results?: {
        id?: string;
        alt_description?: string | null;
        description?: string | null;
        urls?: { thumb?: string; small?: string };
        user?: { name?: string; links?: { html?: string } };
    }[];
}

export const MAX_QUERY_CHARS = 80;
const PER_PAGE = 24;

/**
 * Photos matching a search term.
 *
 * An empty or absent key is a configuration fault rather than a caller's mistake, and it is
 * reported as one — with the advice that upload still works, because a picker that only
 * says "failed" leaves somebody stuck with no way forward.
 */
export async function searchPhotos(query: string): Promise<PhotoResult[]> {
    const term = query.trim().slice(0, MAX_QUERY_CHARS);
    if (!term) return [];

    const accessKey = serverEnv().UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        throw new ApiError(
            "service_unavailable",
            "Photo search is not set up on this server — you can still upload an image.",
        );
    }

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", term);
    url.searchParams.set("per_page", String(PER_PAGE));
    // Landscape suits hero slots, which is where nearly every image field sits.
    url.searchParams.set("orientation", "landscape");

    const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (response.status === 403) {
        // Unsplash answers 403 when the hourly quota is spent. Saying `internal` would tell
        // someone to retry immediately, which is the one thing that cannot work.
        throw new ApiError(
            "rate_limited",
            "Photo search is busy right now. Try again shortly, or upload an image.",
        );
    }
    if (!response.ok) {
        throw new ApiError(
            "service_unavailable",
            "Could not reach photo search — you can still upload an image.",
            `search -> ${response.status}`,
        );
    }

    const body = (await response.json()) as UnsplashSearchResponse;

    return (body.results ?? [])
        .filter((photo) => photo.id && photo.urls?.thumb)
        .map((photo) => ({
            id: photo.id!,
            thumbUrl: photo.urls!.thumb!,
            description: photo.alt_description ?? photo.description ?? "",
            credit: {
                name: photo.user?.name ?? "Unsplash",
                link: photo.user?.links?.html ?? "https://unsplash.com",
            },
        }));
}
