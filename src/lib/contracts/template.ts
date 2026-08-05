import type { ContentSchema } from "./content-schema";

export type Category =
  | "portfolio"
  | "restaurant"
  | "saas"
  | "blog"
  | "event"
  | "resume"
  | "agency"
  | "store"
  | "nonprofit"
  | "other";

export type FileMap = Record<string, string>;

// Pricing tier shown on the tile and in the detail modal (Doc 22 P1-P3, Amendment A1).
// free = Rs 0, premium = Rs 499, signature = Rs 999.
export type TemplateTier = "free" | "premium" | "signature";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: Category;
  tags: string[];
  thumbnailUrl: string;
  files: FileMap;
  contentSchema: ContentSchema;
  license: string;
  sourceUrl: string;
  tier: TemplateTier;
  priceInr: number;
}
