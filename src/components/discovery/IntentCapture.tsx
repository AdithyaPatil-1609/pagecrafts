"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

import type { Category, Palette, Tone } from "@/lib/contracts";
import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { INTENT_CARDS } from "@/lib/discovery/intent-cards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// What the classifier told us about a description, in the form the gallery can rank with.
interface Classified {
  category: Category;
  tone?: Tone;
  palette?: Palette;
}

// Classify the free-text description via Hanish's endpoint. On ANY failure — network,
// error envelope (a signed-out 401 included), bad shape, or the route's own safe default
// (`fallback: true`) — return null and continue (D-2, FR-024): the funnel is never blocked
// by a classification problem.
//
// null means "we learned nothing", which is NOT the same as the model deciding the site is
// genuinely "other". Ranking on attributes we never established would push the library into
// an arbitrary order, so the caller sends them to the gallery in its own order instead.
//
// Tone and palette ride along with the category (D5). They are worth carrying because the
// designs are tagged in the same vocabulary — "dark", "warm", "minimal", "bold" — so they
// are real signal in the deterministic score, not decoration.
async function classifyText(text: string): Promise<Classified | null> {
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
      const data = (json as {
        data?: { category?: string; tone?: string; palette?: string; fallback?: boolean };
      }).data;

      // A fallback classification is the route's safe default, not something learned:
      // its tone and palette are placeholders and must not be passed off as signal.
      if (data?.category && !data.fallback) {
        return {
          category: data.category as Category,
          ...(data.tone ? { tone: data.tone as Tone } : {}),
          ...(data.palette ? { palette: data.palette as Palette } : {}),
        };
      }
    }
  } catch {
    // fall through to the null result
  }
  return null;
}

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

  // The description path. What the classifier works out is sent as `intent`, not
  // `category`: a guess ranks the gallery, an explicit pick filters it (see
  // lib/discovery/ranking.ts). Describing "a website for my gym" should lead with the
  // fitness design and still show the other eleven, not narrow the library to one.
  //
  // Where classification learns nothing the gallery simply opens in its own order. The
  // funnel always advances (D-2). The text rides along so the gallery can show it back and
  // offer an edit.
  async function generate() {
    setBusy("generate");
    const text = describe.trim();
    const classified = text ? await classifyText(text) : null;

    const params = new URLSearchParams();
    if (classified) {
      params.set("intent", classified.category);
      if (classified.tone) params.set("tone", classified.tone);
      if (classified.palette) params.set("palette", classified.palette);
    }
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
          {INTENT_CARDS.map((card) => (
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
