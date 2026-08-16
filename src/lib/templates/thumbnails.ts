import type { Template } from "@/lib/contracts";

import MANIFEST from "./thumbnail-manifest.json";

// Where a design's thumbnail comes from (D6, rendered at R2 D18).
//
// The rule has not changed and is the whole point of this module: advertise a thumbnail only
// when there is one. Until D18 there was never one — `public/templates/` was not even a
// directory — so this returned null, the gallery drew a miniature parsed from the design's
// own markup, and no caller was handed a URL that 404s. The API keeping that promise is why
// nobody shipped a page of broken images in the meantime.
//
// There are files now: `npm run templates:thumbs` renders all 115 into public/templates/ and
// writes the manifest below. The manifest, not the directory, is what this reads — a
// server-side `existsSync` per template would be a filesystem call per tile on every gallery
// render, and it would answer differently on a machine that has not run the renderer. A
// checked-in list is the same answer everywhere, including in the browser.
//
// A design missing from the manifest still gets null, and the gallery still draws its
// miniature. That is deliberate: a partial render degrades one tile instead of breaking the
// page, and a design added without a thumbnail is not a broken image.
//
// The parsed miniature is not a stopgap, incidentally — it cannot advertise a layout the
// template does not have, because it is drawn from the very files it advertises. A rendered
// image can go stale against the design it depicts. Keeping the files in the repository is
// what answers that: designs.ts and its thumbnail move in the same commit.

/**
 * Set to serve thumbnails from object storage instead, e.g. a Supabase Storage public URL.
 *
 * The files are static assets today and served by the CDN in front of the app. This is the
 * seam that makes moving them one environment variable rather than a change to any caller —
 * so it stays, even though nothing sets it.
 */
const THUMBNAIL_BASE = process.env.NEXT_PUBLIC_TEMPLATE_THUMBNAIL_BASE?.replace(/\/$/, "");

const RENDERED = new Set<string>(MANIFEST as string[]);

/** The public path of a rendered thumbnail. The renderer writes to the matching file. */
export function thumbnailPath(id: string): string {
    return `/templates/${id}.webp`;
}

/** Every design the renderer has produced a thumbnail for. */
export function renderedThumbnailIds(): readonly string[] {
    return MANIFEST as string[];
}

/**
 * The URL of this design's pre-rendered thumbnail, or null when it has none.
 *
 * Null is the honest answer, not a missing feature: the caller renders the miniature it
 * already has rather than an image that will not load.
 */
export function thumbnailUrlFor(template: Pick<Template, "id">): string | null {
    if (!RENDERED.has(template.id)) return null;
    return THUMBNAIL_BASE
        ? `${THUMBNAIL_BASE}/${template.id}.webp`
        : thumbnailPath(template.id);
}
