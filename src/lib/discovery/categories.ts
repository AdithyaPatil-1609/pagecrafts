import type { Category, Template } from "@/lib/contracts";

// Display labels for every value of the frozen Category enum. Using Record<Category, …>
// means a new enum value fails to compile until it gets a label here (D-1).
export const CATEGORY_LABELS: Record<Category, string> = {
  portfolio: "Portfolio",
  restaurant: "Restaurant",
  saas: "SaaS",
  blog: "Blog",
  // "Events", "Food & Beverage" and "E-commerce" are the words the second batch's tiles
  // use. The label is shared, so Event and Restaurant now read that way too — the designs
  // themselves are untouched, only the word above them changed.
  event: "Events",
  resume: "Resume",
  agency: "Agency",
  store: "E-commerce",
  nonprofit: "Nonprofit",
  other: "Other",
  fitness: "Fitness",
  food: "Food & Beverage",
  photography: "Photography",
  architecture: "Architecture",
  education: "Education",
  travel: "Travel",
  business: "Business",
  beauty: "Beauty & Wellness",
  real_estate: "Real Estate",
  healthcare: "Healthcare",
  design: "Design",
  professional_services: "Professional Services",
  entertainment: "Entertainment",
  hospitality: "Hospitality",
  automotive: "Automotive",
  media: "Media",
};

// The cards on the intent screen (screen 03), in display order. This is the set of
// categories the library actually ships a design for — the twelve of the R2 refresh — so
// every card a user can pick lands them on at least one template and never an empty grid
// (D-6). It is deliberately narrower than the full Category enum: the classifier may still
// emit a broader bucket (e.g. `saas`), which routes to the unfiltered gallery rather than
// stranding the user, with `other` as the catch-all.
export const CATEGORY_CARDS: Category[] = [
  "fitness",
  "portfolio",
  "food",
  "blog",
  "resume",
  "photography",
  "architecture",
  "education",
  "travel",
  "agency",
  "business",
  "event",
  // The buckets designs 13-24 brought with them.
  "beauty",
  "real_estate",
  "healthcare",
  "design",
  "professional_services",
  "entertainment",
  "store",
  // The buckets designs 25-36 brought with them.
  "hospitality",
  "automotive",
  "media",
  "nonprofit",
];

const CATEGORY_SET = new Set<string>(CATEGORY_CARDS);

// Narrow an untrusted URL/query value to a category the gallery can filter on, or
// undefined. Only the categories the library covers are accepted; anything else — an
// unknown value, or an enum bucket with no design — is ignored and shows the whole library
// rather than raising an error or an empty grid (D-4, FR-035).
export function toCategory(value: string | undefined | null): Category | undefined {
  return value && CATEGORY_SET.has(value) ? (value as Category) : undefined;
}

// The gallery filter. No category means the whole library — an absent filter is not an
// empty one (D-4). Kept here rather than inline in the page so it can be tested directly.
export function filterByCategory(
  templates: Template[],
  category: Category | undefined,
): Template[] {
  return category ? templates.filter((t) => t.category === category) : templates;
}
