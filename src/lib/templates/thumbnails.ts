import type { Template } from "@/lib/contracts";

// Where a design's thumbnail comes from (D6).
//
// Every template record carries `thumbnailUrl: /templates/<id>/thumbnail.png`, and not one
// of those files exists — `public/templates/` is not even a directory. Nothing is visibly
// broken today because the gallery draws a miniature parsed from the design's own markup
// (lib/discovery/preview.ts) and never reads the field. But the API would have handed every
// caller a URL that 404s, which is a promise the library cannot keep, and the first
// integrator to trust it would have shipped twelve broken images.
//
// So the rule is: advertise a thumbnail only when there is one. Until the render pipeline
// exists the answer is null, the gallery keeps drawing the miniature, and no caller is
// misled. When thumbnails are generated into Supabase Storage (D16-D18) this returns their
// public URL and callers that prefer an image get one without any other change.
//
// The parsed miniature is not a stopgap for the tile, incidentally — it cannot advertise a
// layout the template does not have, because it is drawn from the very files it advertises.
// A rendered PNG can go stale against the design it depicts; that is the trade being made
// when the pipeline lands.

/** Set once thumbnails are rendered into storage, e.g. `https://<project>.supabase.co/...`. */
const THUMBNAIL_BASE = process.env.NEXT_PUBLIC_TEMPLATE_THUMBNAIL_BASE?.replace(/\/$/, "");

/**
 * The URL of this design's pre-rendered thumbnail, or null when it has none.
 *
 * Null is the honest answer, not a missing feature: the caller renders the miniature it
 * already has rather than an image that will not load.
 */
export function thumbnailUrlFor(template: Pick<Template, "id">): string | null {
    return THUMBNAIL_BASE ? `${THUMBNAIL_BASE}/${template.id}.png` : null;
}
