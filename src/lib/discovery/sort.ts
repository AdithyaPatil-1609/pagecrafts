import type { Template, TemplateTier } from "@/lib/contracts";

// Gallery ordering, carried in the URL next to `category` so a sorted grid can be shared
// and reloaded (D-4). Same shape as the category filter: an unrecognised value is ignored
// rather than raising, and "no sort" means the library's own recommended order.

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

// Cheapest first; the reverse ordering puts the richest designs at the top.
const TIER_RANK: Record<TemplateTier, number> = {
    free: 0,
    premium: 1,
    signature: 2,
};

// Always returns a new array — the registry is a module-level constant and must not be
// reordered in place (the same rule filterByCategory follows).
export function sortTemplates(templates: Template[], key: SortKey): Template[] {
    const sorted = [...templates];

    switch (key) {
        case "free-first":
            return sorted.sort(
                (a, b) =>
                    TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.name.localeCompare(b.name),
            );
        case "premium-first":
            return sorted.sort(
                (a, b) =>
                    TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.name.localeCompare(b.name),
            );
        case "name":
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case "recommended":
        default:
            return sorted;
    }
}
