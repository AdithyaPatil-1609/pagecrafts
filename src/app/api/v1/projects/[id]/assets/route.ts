import "server-only";

import { withRoute } from "@/lib/kernel/with-route";
import { ApiError, fail, ok } from "@/lib/errors/respond";
import { createUnsplashAssetSchema } from "@/lib/contracts/schemas";
import type { AssetKind } from "@/lib/contracts";
import {
  MAX_ASSET_BYTES,
  createAssetFromUnsplash,
  createAssetFromUpload,
} from "@/lib/data/project-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

const KINDS: AssetKind[] = ["image", "favicon", "og_image"];

function toKind(value: unknown): AssetKind {
  return KINDS.includes(value as AssetKind) ? (value as AssetKind) : "image";
}

// POST /api/v1/projects/{id}/assets — an Unsplash pick (JSON) or a direct upload
// (multipart). The body is parsed here rather than via withRoute's schema because the
// two arrive with different content types.
export const POST = withRoute<undefined, Params>({
  handler: async ({ req, supabase, userId, params }) => {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      const file = form?.get("file");
      if (!form || !(file instanceof File)) {
        return fail("validation_failed", "Attach the image as a form field named \"file\".");
      }
      // E-4: refuse oversized uploads before reading the body into memory.
      if (file.size > MAX_ASSET_BYTES) {
        throw new ApiError(
          "payload_too_large",
          "That image is too large — the limit is 5 MB.",
          `${file.size} bytes`,
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      return ok(
        await createAssetFromUpload(
          supabase,
          userId,
          params.id,
          { bytes, mimeType: file.type },
          toKind(form.get("kind")),
        ),
        201,
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = createUnsplashAssetSchema.safeParse(json);
    if (!parsed.success) {
      return fail("validation_failed", "Some fields were invalid.", parsed.error.message);
    }
    return ok(
      await createAssetFromUnsplash(
        supabase,
        userId,
        params.id,
        parsed.data.unsplashId,
        parsed.data.kind ?? "image",
      ),
      201,
    );
  },
});
