"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Category } from "@/lib/contracts";
import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { CATEGORY_CARDS, CATEGORY_LABELS } from "@/lib/discovery/categories";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Classify the free-text description via Hanish's endpoint. On ANY failure — network,
// error envelope (a signed-out 401 included), bad shape, or the route's own safe default
// (`fallback: true`) — return null and continue (D-2, FR-024): the funnel is never blocked
// by a classification problem.
//
// null means "we learned nothing", which is NOT the same as the model deciding the site is
// genuinely "other". Filtering on a category we never established would strand the user on
// an empty grid, so the caller sends them to the unfiltered gallery instead.
async function classifyText(text: string): Promise<Category | null> {
  try {
    const res = await fetch("/api/v1/intent/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json: unknown = await res.json();
    if (
      json &&
      typeof json === "object" &&
      "ok" in json &&
      (json as { ok: boolean }).ok
    ) {
      const data = (json as { data?: { category?: string; fallback?: boolean } }).data;
      if (data?.category && !data.fallback) return data.category as Category;
    }
  } catch {
    // fall through to the null result
  }
  return null;
}

export function IntentCapture() {
  const router = useRouter();
  const [selected, setSelected] = useState<Category | null>(null);
  const [describe, setDescribe] = useState("");
  const [busy, setBusy] = useState(false);

  // The one main action. Text wins over a card (it is more specific); a card wins over
  // nothing; both empty goes to the unfiltered gallery. The funnel always advances.
  async function seeTemplates() {
    setBusy(true);
    const text = describe.trim();
    // Text that classified to nothing falls back to the card if there is one, and to the
    // unfiltered gallery if there is not — never to a filter we did not actually establish.
    const category = (text ? await classifyText(text) : null) ?? selected;
    setBusy(false);
    router.push(category ? `/templates?category=${category}` : "/templates");
  }

  const remaining = MAX_CLASSIFY_CHARS - describe.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Pick a category</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {CATEGORY_CARDS.map((category) => {
            const isSelected = selected === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : category)}
                className={cn(
                  "rounded-lg border px-3 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="describe"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Or describe it
        </label>
        <textarea
          id="describe"
          value={describe}
          onChange={(e) => setDescribe(e.target.value)}
          maxLength={MAX_CLASSIFY_CHARS}
          rows={3}
          placeholder="A dark, moody one-page site for a photography studio…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">
          {remaining} characters left
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={seeTemplates} disabled={busy} size="lg">
          {busy ? "Finding designs…" : "See templates"}
        </Button>
      </div>
    </div>
  );
}
