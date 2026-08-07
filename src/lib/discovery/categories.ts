import type { Category } from "@/lib/contracts";

// Display labels for every value of the frozen Category enum. Using Record<Category, …>
// means a new enum value fails to compile until it gets a label here (D-1).
export const CATEGORY_LABELS: Record<Category, string> = {
  portfolio: "Portfolio",
  restaurant: "Restaurant",
  saas: "SaaS",
  blog: "Blog",
  event: "Event",
  resume: "Resume",
  agency: "Agency",
  store: "Store",
  nonprofit: "Non-profit",
  other: "Other",
};

// The fixed cards on the intent screen (screen 03), in display order — exactly the
// frozen enum, no more and no less (D-1, AC-F2-3).
export const CATEGORY_CARDS: Category[] = Object.keys(CATEGORY_LABELS) as Category[];

const CATEGORY_SET = new Set<string>(CATEGORY_CARDS);

// Narrow an untrusted URL/query value to a Category, or undefined. Unrecognised values
// are ignored rather than raising an error (D-4, FR-035).
export function toCategory(value: string | undefined | null): Category | undefined {
  return value && CATEGORY_SET.has(value) ? (value as Category) : undefined;
}
