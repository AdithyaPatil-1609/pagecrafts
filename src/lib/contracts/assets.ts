// POST /projects/{id}/assets — images enter a project here, and only here (S-1).
// Two sources: an Unsplash pick (the server downloads the file and records attribution
// automatically) or a direct upload. Either way the file lands in platform storage and
// an `assets` row carries its provenance; the content panel then points an image slot at
// the stored file's URL via PATCH /content, because a published static page can reference a
// URL and nothing else.

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

// GET /images/search — the photo library the content panel's image slots open (S-1).
// The Unsplash access key stays on the server; the browser sees results, never the key.
export interface ImageSearchResult {
  id: string;
  description: string;
  // Small for the results grid, large for the page itself.
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  attribution: AssetAttribution;
}

export interface ImageSearchResponse {
  items: ImageSearchResult[];
  page: number;
  totalPages: number;
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
