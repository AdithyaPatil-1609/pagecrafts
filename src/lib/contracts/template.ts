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
  | "other"
  // R2 library-refresh: the gallery grew to the twelve designs the discovery mockup
  // shows, and each needs its own bucket so its tile reads with the right label and the
  // classifier can route intent to it. `restaurant` stays for back-compat; new designs
  // use the finer `food`. These are broad buckets — the specific trade still rides on the
  // free-form `vertical`.
  | "fitness"
  | "food"
  | "photography"
  | "architecture"
  | "education"
  | "travel"
  | "business"
  // Designs 13-24 (the second library batch). Each of these exists because a design in
  // that batch is labelled with it on its tile and no existing bucket carries that label:
  // a salon is not "Other", and a dental clinic is not "Business".
  | "beauty"
  | "real_estate"
  | "healthcare"
  | "design"
  | "professional_services"
  | "entertainment";

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
