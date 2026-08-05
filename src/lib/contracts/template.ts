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
}
