"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { DEFAULT_SORT, SORT_KEYS, SORT_LABELS } from "@/lib/discovery/sort";
import type { SortKey } from "@/lib/discovery/sort";

// Sort lives in the URL so an ordered grid can be shared and reloaded. The other
// parameters travel with it — sorting must never silently drop the category or the
// description the user arrived with. The default order is left out of the URL entirely.
export function SortSelect({
    value,
    preserve,
}: {
    value: SortKey;
    preserve: Record<string, string>;
}) {
    const router = useRouter();

    function change(next: string) {
        const params = new URLSearchParams(preserve);
        if (next !== DEFAULT_SORT) params.set("sort", next);
        const query = params.toString();
        router.replace(query ? `/templates?${query}` : "/templates", { scroll: false });
    }

    return (
        <div className="flex items-center gap-2.5">
            <label htmlFor="sort" className="text-sm text-muted-foreground">
                Sort by:
            </label>
            <div className="relative">
                <select
                    id="sort"
                    value={value}
                    onChange={(event) => change(event.target.value)}
                    className="h-10 w-44 appearance-none rounded-lg border border-input bg-field pl-3.5 pr-9 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    {SORT_KEYS.map((key) => (
                        <option key={key} value={key}>
                            {SORT_LABELS[key]}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
            </div>
        </div>
    );
}
