// Asking for the picture at the size it will be shown (R2 D14).
//
// Every design's hero photograph is authored at `?w=1600`, which is right for the page it
// belongs to and wrong for the gallery. A tile draws that image about 320 CSS pixels wide,
// so the browser downloads roughly twenty times the pixels it paints — measured on one of
// the library's own photographs:
//
//   w=1600   259 KB          w=960   114 KB          w=480   42 KB
//
// Lazy loading already keeps the below-the-fold tiles quiet, so the cost is not 115 images;
// it is however many are on screen. A dozen at 259 KB is around 3 MB before anybody has
// chosen anything, against roughly 500 KB at tile size — which is the difference between
// NFR-001's "first paint under 1.5s on throttled 4G" being plausible and being a wish.
//
// Only the request changes. The stored template, the editor's preview and the published
// build all keep the full-size URL: this is about what the gallery asks for, not about
// what a design is.

/** The widths a tile asks for: one for ordinary screens, one for dense ones. */
export const TILE_WIDTH = 480;
export const TILE_WIDTH_2X = 960;

/**
 * The same photograph, requested narrower.
 *
 * Unsplash resizes from the query string, so this is a rewrite of one parameter rather than
 * a different image — the crop, quality and format directives the design chose all survive.
 *
 * Anything that is not an Unsplash URL with a width to change comes back untouched. A
 * design may ship a photograph from anywhere, and guessing at another host's resizing
 * convention would produce URLs that 404 rather than images that are smaller.
 */
export function atWidth(url: string, width: number): string {
    if (!url.includes("images.unsplash.com")) return url;

    try {
        const parsed = new URL(url);
        if (!parsed.searchParams.has("w")) return url;

        parsed.searchParams.set("w", String(width));
        return parsed.toString();
    } catch {
        // A src that is not a parseable URL is one somebody hand-wrote. Leave it alone
        // rather than turning a working relative path into a broken absolute one.
        return url;
    }
}

/**
 * `srcSet` for a gallery tile, or null when the URL cannot be resized.
 *
 * Null rather than a single-entry srcSet: a srcSet that offers one option is a longer way
 * of writing `src`, and it invites the next reader to think a choice is being made.
 */
export function tileSrcSet(url: string): string | null {
    const oneX = atWidth(url, TILE_WIDTH);
    if (oneX === url) return null;

    return `${oneX} 1x, ${atWidth(url, TILE_WIDTH_2X)} 2x`;
}
