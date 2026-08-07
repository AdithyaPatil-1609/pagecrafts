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
