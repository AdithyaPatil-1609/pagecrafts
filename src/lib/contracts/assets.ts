// POST /projects/{id}/assets — images enter a project here, and only here (S-1).
// Two sources: an Unsplash pick (the server downloads the file and records attribution
// automatically) or a direct upload. Either way the file lands in platform storage and
// an `assets` row carries its provenance; the content panel then points an image slot
// at the asset id via PATCH /content.

export type AssetKind = "image" | "favicon" | "og_image";

// JSON body — the Unsplash path.
export interface CreateUnsplashAssetRequest {
  source: "unsplash";
  unsplashId: string;
  kind?: AssetKind;
}

// Photographer credit, written into the page footer automatically (S-1). Never optional
// for an Unsplash asset; empty object for an upload.
export interface AssetAttribution {
  name?: string;
  username?: string;
  link?: string;
}

export interface AssetResponse {
  id: string;
  kind: AssetKind;
  mimeType: string;
  byteSize: number;
  // A time-limited signed URL for immediate preview; the bucket itself is private.
  url: string | null;
  attribution: AssetAttribution;
}
