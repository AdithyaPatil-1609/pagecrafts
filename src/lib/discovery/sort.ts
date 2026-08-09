// The sort vocabulary — the keys the picker offers and their labels, carried in the URL
// next to `category` so a sorted grid can be shared and reloaded (D-4). An unrecognised
// value is ignored rather than raising, and "no sort" means the library's own recommended
// order.
//
// The ordering itself lives with the query that applies it (lib/templates/query.ts), so the
// gallery and GET /templates cannot drift into sorting differently.

export type SortKey = "recommended" | "free-first" | "premium-first" | "name";

export const SORT_LABELS: Record<SortKey, string> = {
    recommended: "Recommended",
    "free-first": "Free first",
    "premium-first": "Premium first",
    name: "Name (A–Z)",
};

export const SORT_KEYS: SortKey[] = Object.keys(SORT_LABELS) as SortKey[];

export const DEFAULT_SORT: SortKey = "recommended";

const SORT_SET = new Set<string>(SORT_KEYS);

export function toSort(value: string | undefined | null): SortKey {
    return value && SORT_SET.has(value) ? (value as SortKey) : DEFAULT_SORT;
}
