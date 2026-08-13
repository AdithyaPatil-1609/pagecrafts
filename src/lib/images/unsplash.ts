import "server-only";
import type { ImageSearchResponse, ImageSearchResult } from "@/lib/contracts";
import { serverEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/errors/respond";

// The photo library behind the content panel's image slots (S-1).
//
// Search is a read: it registers no download and creates no asset. Picking a result is the
// write, and that goes through POST /projects/{id}/assets, which records provenance and the
// photographer's credit. Keeping them apart is what lets someone browse without leaving a
// trail of half-chosen images in their project.
//
// The access key never leaves the server (SEC: no secret in the client bundle).

const SEARCH_URL = "https://api.unsplash.com/search/photos";
export const PER_PAGE = 24;
export const MAX_QUERY_CHARS = 80;

interface UnsplashSearchPhoto {
  id: string;
  description?: string | null;
  alt_description?: string | null;
  width?: number;
  height?: number;
  urls?: { small?: string; regular?: string };
  user?: { name?: string; username?: string; links?: { html?: string } };
}

interface UnsplashSearchBody {
  results?: UnsplashSearchPhoto[];
  total_pages?: number;
}

function toResult(photo: UnsplashSearchPhoto): ImageSearchResult | null {
  const thumbUrl = photo.urls?.small;
  const fullUrl = photo.urls?.regular;
  if (!photo.id || !thumbUrl || !fullUrl) return null;

  return {
    id: photo.id,
    // Unsplash's own alt text where there is one — it is what a screen reader will read
    // out on the published page, so an empty string is better than a made-up sentence.
    description: (photo.alt_description ?? photo.description ?? "").trim(),
    thumbUrl,
    fullUrl,
    width: photo.width ?? 0,
    height: photo.height ?? 0,
    attribution: {
      name: photo.user?.name,
      username: photo.user?.username,
      link: photo.user?.links?.html,
    },
  };
}

export function isImageSearchConfigured(): boolean {
  return Boolean(serverEnv().UNSPLASH_ACCESS_KEY);
}

export async function searchImages(query: string, page: number): Promise<ImageSearchResponse> {
  const accessKey = serverEnv().UNSPLASH_ACCESS_KEY;

  // Not a failure of this request — a server that was never given a key. Said plainly, so
  // the picker can offer the upload path instead of looking broken.
  if (!accessKey) {
    throw new ApiError(
      "validation_failed",
      "Photo search is not switched on for this server — upload an image instead.",
    );
  }

  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("content_filter", "high");

  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });
  } catch (error) {
    throw new ApiError(
      "internal",
      "Could not reach the photo library — try again in a moment.",
      error instanceof Error ? error.message : undefined,
    );
  }

  if (response.status === 403 || response.status === 429) {
    throw new ApiError(
      "rate_limited",
      "The photo library is busy right now — try again in a minute.",
      `unsplash ${response.status}`,
    );
  }
  if (!response.ok) {
    throw new ApiError(
      "internal",
      "Could not reach the photo library — try again in a moment.",
      `unsplash ${response.status}`,
    );
  }

  const body = (await response.json().catch(() => null)) as UnsplashSearchBody | null;
  const items = (body?.results ?? [])
    .map(toResult)
    .filter((item): item is ImageSearchResult => item !== null);

  return { items, page, totalPages: body?.total_pages ?? (items.length > 0 ? page : 0) };
}
