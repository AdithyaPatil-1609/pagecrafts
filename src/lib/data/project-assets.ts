import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetAttribution, AssetKind, AssetResponse } from "@/lib/contracts";
import { serverEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/errors/respond";
import { clientFault } from "./pg-errors";

// POST /projects/{id}/assets (S-1, E-4). Every image enters through here: an Unsplash
// pick the server downloads itself (the access key never reaches the browser), or a
// direct upload. Files land in the private `project-assets` bucket under
// {userId}/{projectId}/… — the folder the storage RLS policies key on — and an `assets`
// row records provenance + attribution.

// Mirrors the bucket's file_size_limit and the assets.byte_size CHECK (5 MB).
export const MAX_ASSET_BYTES = 5_242_880;

const BUCKET = "project-assets";
const SIGNED_URL_SECONDS = 3600;

// Mirrors the bucket's allowed_mime_types.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export function isAllowedImageMime(mime: string): boolean {
  return mime in EXTENSION_BY_MIME;
}

interface IncomingAsset {
  bytes: Uint8Array;
  mimeType: string;
  kind: AssetKind;
  sourceUrl: string | null;
  attribution: AssetAttribution;
}

async function requireProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new ApiError("internal", "Could not read the project.", error.message);
  if (!data) throw new ApiError("not_found", "That project does not exist.");
}

// The shared tail of both paths: size + type gates, storage write, assets row, signed URL.
async function storeAsset(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  incoming: IncomingAsset,
): Promise<AssetResponse> {
  if (!isAllowedImageMime(incoming.mimeType)) {
    throw new ApiError(
      "validation_failed",
      "Only JPEG, PNG, WebP, GIF or SVG images are allowed.",
      incoming.mimeType,
    );
  }
  if (incoming.bytes.byteLength === 0) {
    throw new ApiError("validation_failed", "The image file is empty.");
  }
  if (incoming.bytes.byteLength > MAX_ASSET_BYTES) {
    throw new ApiError(
      "payload_too_large",
      "That image is too large — the limit is 5 MB.",
      `${incoming.bytes.byteLength} bytes`,
    );
  }

  const storagePath = `${userId}/${projectId}/${crypto.randomUUID()}.${EXTENSION_BY_MIME[incoming.mimeType]}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, incoming.bytes, { contentType: incoming.mimeType });

  if (uploadError) {
    throw new ApiError("internal", "Could not store the image.", uploadError.message);
  }

  const { data: row, error: insertError } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      storage_path: storagePath,
      kind: incoming.kind,
      mime_type: incoming.mimeType,
      byte_size: incoming.bytes.byteLength,
      source_url: incoming.sourceUrl,
      attribution: incoming.attribution,
    })
    .select("id")
    .single();

  if (insertError) {
    // Roll the orphaned file back out of storage; the row is the source of truth.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    if (/asset size limit exceeded/i.test(insertError.message)) {
      throw new ApiError(
        "payload_too_large",
        "This project has run out of image space (25 MB).",
        insertError.message,
      );
    }
    throw (
      clientFault(insertError, "That image was not allowed.") ??
      new ApiError("internal", "Could not save the image record.", insertError.message)
    );
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  return {
    id: row.id,
    kind: incoming.kind,
    mimeType: incoming.mimeType,
    byteSize: incoming.bytes.byteLength,
    url: signed?.signedUrl ?? null,
    attribution: incoming.attribution,
  };
}

export async function createAssetFromUpload(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  file: { bytes: Uint8Array; mimeType: string },
  kind: AssetKind,
): Promise<AssetResponse> {
  await requireProject(supabase, projectId);
  return storeAsset(supabase, userId, projectId, {
    bytes: file.bytes,
    mimeType: file.mimeType,
    kind,
    sourceUrl: null,
    attribution: {},
  });
}

interface UnsplashPhoto {
  urls?: { regular?: string };
  links?: { html?: string; download_location?: string };
  user?: { name?: string; username?: string; links?: { html?: string } };
}

// The Unsplash pick (S-1). The server fetches the photo's metadata, registers the
// download (their API guideline), pulls the binary, and records the photographer's
// credit so the footer attribution can render automatically.
export async function createAssetFromUnsplash(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  unsplashId: string,
  kind: AssetKind,
): Promise<AssetResponse> {
  await requireProject(supabase, projectId);

  const accessKey = serverEnv().UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new ApiError(
      "internal",
      "Image search is not configured on this server — upload an image instead.",
    );
  }
  const headers = { Authorization: `Client-ID ${accessKey}` };

  const metaRes = await fetch(
    `https://api.unsplash.com/photos/${encodeURIComponent(unsplashId)}`,
    { headers },
  );
  if (metaRes.status === 404) {
    throw new ApiError("not_found", "That photo does not exist on Unsplash.");
  }
  if (!metaRes.ok) {
    throw new ApiError(
      "internal",
      "Could not reach Unsplash — upload an image instead.",
      `photos/${unsplashId} -> ${metaRes.status}`,
    );
  }
  const photo = (await metaRes.json()) as UnsplashPhoto;

  const imageUrl = photo.urls?.regular;
  if (!imageUrl) {
    throw new ApiError("internal", "Unsplash returned no usable image for that photo.");
  }

  // Register the download per Unsplash's API terms; a failure here must not block the pick.
  if (photo.links?.download_location) {
    await fetch(photo.links.download_location, { headers }).catch(() => undefined);
  }

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new ApiError(
      "internal",
      "Could not download that photo — upload an image instead.",
      `image -> ${imageRes.status}`,
    );
  }

  const mimeType = imageRes.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";
  const bytes = new Uint8Array(await imageRes.arrayBuffer());

  return storeAsset(supabase, userId, projectId, {
    bytes,
    mimeType,
    kind,
    sourceUrl: photo.links?.html ?? `https://unsplash.com/photos/${unsplashId}`,
    attribution: {
      name: photo.user?.name,
      username: photo.user?.username,
      link: photo.user?.links?.html,
    },
  });
}
