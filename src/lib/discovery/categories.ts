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
  beauty: "Beauty",
  real_estate: "Real Estate",
  healthcare: "Healthcare",
  design: "Design",
  professional_services: "Professional Services",
  entertainment: "Entertainment",
  hospitality: "Hospitality",
  automotive: "Automotive",
  media: "Media",
  sports: "Sports",
  health_wellness: "Health & Wellness",
  pets: "Pets",
  arts_culture: "Arts & Culture",
  retail: "Retail",
  finance: "Finance",
  // Folded into "Health & Wellness" at R2 D17. These three were kept apart because the
  // mockups kept them apart — a spa was "Health & Wellness", a counselling practice
  // "Wellness", a nutritionist "Health" — which is a distinction the person who wrote the
  // mockup was making, not one the person browsing would. The labels stay because the enum
  // values stay; see CATEGORY_ALIASES below for why, and what they resolve to.
  wellness: "Wellness",
  health: "Health",
  creative: "Creative",
  technology: "Technology",
  // The seventh batch's two new shelves. "Professional" is the coach's label and stays
  // distinct from "Professional Services" above — see the note by the enum in
  // contracts/template.ts.
  professional: "Professional",
  personal: "Personal",
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
  "business",
  "event",
  // The buckets designs 13-24 brought with them.
  "beauty",
  "real_estate",
  "healthcare",
  "design",
  "professional_services",
  "entertainment",
  // "E-commerce". One of the original ten, and the library has shipped designs for it
  // since the second batch — fourteen of them, from `shop` through to `handmade-crafts`.
  // It was dropped from this list during the R2 refresh, which took the gallery's only
  // e-commerce shelf off the intent screen and made `?category=store` unfilterable,
  // because `toCategory` below accepts only what is carded.
  "store",
  // The buckets designs 25-36 brought with them.
  "hospitality",
  "automotive",
  "media",
  "nonprofit",
  // The buckets designs 37-51 brought with them.
  "sports",
  "health_wellness",
  "pets",
  "arts_culture",
  "finance",
  // The buckets designs 52-68 brought with them.
  "creative",
  // The bucket designs 69-83 brought with them.
  "technology",
  // The buckets designs 84-92 brought with them.
  "professional",
  "personal",
];

const CATEGORY_SET = new Set<string>(CATEGORY_CARDS);

/**
 * Shelves that were folded into another shelf at R2 D17, and where they went.
 *
 * The taxonomy grew one bucket at a time, each batch adding whatever word its mockup used,
 * and it arrived at 35 shelves with four that nobody browsing reads as distinct: `agency`
 * held a single design called "Agency" while `business` already held Marketing Agency,
 * Digital Agency, Recruitment Agency and Recruitment Firm; `wellness` (a counsellor) and
 * `health` (a nutritionist) sat beside `health_wellness` (a yoga studio, a spa); `retail`
 * held a bookshop and a florist beside `store`'s fourteen shops.
 *
 * The enum values stay. Removing them would break three things at once — a bookmarked
 * `?category=retail`, a classifier that has always been allowed to emit any Category, and
 * the database's own `template_category` type — for no gain, since a fold is a display
 * decision and this is the display layer. So the value keeps working and lands the person
 * on the shelf the designs actually moved to, rather than on an empty grid or, worse,
 * silently on the whole library as though they had never filtered.
 */
export const CATEGORY_ALIASES: Partial<Record<Category, Category>> = {
  agency: "business",
  wellness: "health_wellness",
  health: "health_wellness",
  retail: "store",
};

const ALIAS_LOOKUP = new Map<string, Category>(Object.entries(CATEGORY_ALIASES) as [string, Category][]);

/**
 * Narrow an untrusted URL/query value to a category the gallery can filter on, or
 * undefined. Only the categories the library covers are accepted; anything else — an
 * unknown value, or an enum bucket with no design — is ignored and shows the whole library
 * rather than raising an error or an empty grid (D-4, FR-035).
 *
 * A folded shelf resolves to the shelf it was folded into, so an old link still filters.
 */
export function toCategory(value: string | undefined | null): Category | undefined {
  if (!value) return undefined;
  // A Map, not the object literal. Indexing a plain object with an untrusted string walks
  // the prototype chain, so `?category=__proto__` came back as Object.prototype and
  // `?category=constructor` as a function — both then travelling on as though they were a
  // category. The existing test for exactly this caught it.
  const folded = ALIAS_LOOKUP.get(value);
  if (folded) return folded;
  return CATEGORY_SET.has(value) ? (value as Category) : undefined;
}

// The gallery filter. No category means the whole library — an absent filter is not an
// empty one (D-4). Kept here rather than inline in the page so it can be tested directly.
export function filterByCategory(
  templates: Template[],
  category: Category | undefined,
): Template[] {
  return category ? templates.filter((t) => t.category === category) : templates;
}
