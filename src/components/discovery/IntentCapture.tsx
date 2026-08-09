"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

import type { Category } from "@/lib/contracts";
import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
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

// The category cards on the describe screen — the six broad buckets the mockup shows, each
// a real Category the gallery can filter on. Photographs are hosted on Unsplash (Unsplash
// licence — free to use, no attribution required).
const CARD_PHOTO = "?w=800&q=70&auto=format&fit=crop";
const cardImg = (id: string): string => `https://images.unsplash.com/${id}${CARD_PHOTO}`;

interface CategoryCard {
  category: Category;
  label: string;
  description: string;
  image: string;
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    category: "business",
    label: "Business",
    description: "Corporate sites, company profiles, and professional services.",
    image: cardImg("photo-1486406146926-c627a92ad1ab"),
  },
  {
    category: "portfolio",
    label: "Portfolio",
    description: "Showcase your work, skills, and creative projects.",
    image: cardImg("photo-1498050108023-c5249f4df085"),
  },
  {
    category: "blog",
    label: "Blog",
    description: "Share your ideas, stories, and expertise with your audience.",
    image: cardImg("photo-1517842645767-c639042777db"),
  },
  {
    category: "store",
    label: "E-commerce",
    description: "Sell products online with beautiful storefronts and secure checkout.",
    image: cardImg("photo-1607082348824-0a96f2a4b9da"),
  },
  {
    category: "event",
    label: "Event",
    description: "Promote events, sell tickets, and engage attendees.",
    image: cardImg("photo-1470229722913-7c0e2dbbafd3"),
  },
  {
    category: "other",
    label: "Other",
    description: "Non-profits, communities, landing pages, and more.",
    image: cardImg("photo-1522071820081-009f0129c71c"),
  },
];

export function IntentCapture({
  initialDescribe = "",
  initialCategory = null,
}: {
  initialDescribe?: string;
  initialCategory?: Category | null;
} = {}) {
  const router = useRouter();
  const [describe, setDescribe] = useState(initialDescribe);
  const [busy, setBusy] = useState<"generate" | Category | null>(null);

  // The description path. Text classifies to a category where it can; where it cannot, the
  // gallery opens unfiltered rather than on a filter we never established. The funnel always
  // advances (D-2). The text rides along so the gallery can show it back and offer an edit.
  async function generate() {
    setBusy("generate");
    const text = describe.trim();
    const category = text ? await classifyText(text) : null;

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (text) params.set("q", text);
    const query = params.toString();
    router.push(query ? `/templates?${query}` : "/templates");
  }

  // A category card is the direct path: straight to the gallery, pre-filtered.
  function pickCategory(category: Category) {
    setBusy(category);
    router.push(`/templates?category=${category}`);
  }

  const used = describe.length;

  return (
    <div className="flex flex-col gap-7">
      {/* The describe box — free text plus the AI-enhancement affordance and Generate. It
          sits in a narrower column than the cards below, so the eye starts here. */}
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/60 p-3.5 shadow-sm transition-colors focus-within:border-primary/50">
        <label htmlFor="describe" className="sr-only">
          Describe the website you want to build
        </label>
        <textarea
          id="describe"
          value={describe}
          onChange={(e) => setDescribe(e.target.value)}
          maxLength={MAX_CLASSIFY_CHARS}
          rows={2}
          placeholder="I want to build a website for…"
          className="block w-full resize-none bg-transparent px-2 pb-2.5 pt-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-2.5">
          <AiEnhancementMenu />
          <span className="ml-auto text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {used}/{MAX_CLASSIFY_CHARS}
          </span>
          <Button
            onClick={generate}
            disabled={busy !== null}
            className="rounded-lg font-semibold"
          >
            {busy === "generate" ? "Generating…" : "Generate"}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>

      {/* The "Next" pill on a divider, exactly as the mockup steps down to the cards. */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
        <span className="relative rounded-full border border-border bg-background px-4 py-1 text-xs font-medium text-muted-foreground">
          Next
        </span>
      </div>

      {/* The category cards. The photo is inset inside the card rather than bled to its
          edges, so the six read as a row of tiles rather than a filmstrip. */}
      <section className="flex flex-col gap-4">
        <header className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Choose a category</h2>
          <p className="text-sm text-muted-foreground">
            Select the category that best fits your website
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_CARDS.map((card) => (
            <button
              key={card.category}
              type="button"
              onClick={() => pickCategory(card.category)}
              disabled={busy !== null}
              aria-label={`${card.label}: ${card.description}`}
              className={cn(
                "group flex flex-col gap-2.5 rounded-2xl border bg-card p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70",
                initialCategory === card.category
                  ? "border-primary"
                  : "border-border hover:border-primary/50",
              )}
            >
              <span className="block overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="aspect-3/2 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <span className="flex flex-1 flex-col gap-1 px-1 pb-2">
                <span className="text-sm font-semibold text-foreground">{card.label}</span>
                <span className="text-xs leading-5 text-muted-foreground">{card.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// A styled affordance for AI-assisted description. The menu is a light touch: it records a
// preference the description path can use, and matches the mockup's collapsed pill.
function AiEnhancementMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
        AI Enhancement
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-xl border border-border bg-card p-1 text-sm shadow-lg"
        >
          <p className="px-3 py-2 text-xs text-muted-foreground">
            AI can expand a short description into a fuller brief before it builds.
          </p>
        </div>
      )}
    </div>
  );
}
