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
  | "entertainment"
  // Designs 25-36 (the third batch), on the same rule: a bucket exists because a tile is
  // labelled with it and nothing already carried that label.
  | "hospitality"
  | "automotive"
  | "media"
  // Designs 37-51 (the fourth batch). Note health_wellness sits alongside beauty: the
  // mockups label a spa "Health & Wellness" and a salon "Beauty & Wellness", and those are
  // different shelves to the person choosing.
  | "sports"
  | "health_wellness"
  | "pets"
  | "arts_culture"
  | "retail"
  | "finance"
  // Designs 52-68 (the fifth batch). `wellness` and `health` are separate buckets from
  // `health_wellness` because the mockups label them separately — see the note by their
  // labels in lib/discovery/categories.ts, which is where that decision is worth reading.
  | "wellness"
  | "health"
  | "creative";

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
