import { z } from "zod";

// Runtime request validators for the persistence routes. Kept aligned with the
// TypeScript contracts in this folder; Zod guards the HTTP boundary (M0.2).

export const createProjectSchema = z.object({
  name: z.string().min(1).max(80),
  sourceTemplateId: z.string().uuid().optional(),
  mode: z.literal("generate").optional(),
  prompt: z.string().max(500).optional(),
});

export const patchProjectSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  siteMeta: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      faviconAssetId: z.string().optional(),
      ogImageAssetId: z.string().optional(),
    })
    .optional(),
  formEndpoint: z
    .string()
    .url()
    .startsWith("https://", "The form address must start with https://")
    .nullable()
    .optional(),
});

export const putFilesSchema = z.object({
  files: z.record(z.string(), z.string()),
});

// PUT /projects/{id}/files/{path} — a single file write. The path itself arrives in the
// URL and is validated separately (isValidFilePath -> 422).
export const putFileSchema = z.object({
  content: z.string(),
});

// PATCH /projects/{id}/content — ops against content_json. Semantic validation (does the
// slot exist, does the value fit its FieldType) happens against the template's
// content_schema after parse; this only guards the transport shape.
export const patchContentSchema = z.object({
  ops: z
    .array(
      z.object({
        path: z.string().min(1).max(200),
        value: z.unknown(),
      }),
    )
    .min(1)
    .max(50),
});

// POST /projects/{id}/assets — the JSON (Unsplash) body. Uploads arrive as multipart
// form-data and never hit this schema.
export const createUnsplashAssetSchema = z.object({
  source: z.literal("unsplash"),
  unsplashId: z.string().min(1).max(80),
  kind: z.enum(["image", "favicon", "og_image"]).optional(),
});

export const createCommitSchema = z.object({
  message: z.string().min(1).max(500),
});

// POST /projects/{id}/restore — the sha shape is the commits.sha column's own check, so a
// value that could never exist is refused at the edge rather than as a miss in the table.
export const restoreSchema = z.object({
  sha: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/, "That is not a version id."),
});

