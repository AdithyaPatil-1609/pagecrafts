"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

import type { Category, CreateProjectResponse } from "@/lib/contracts";
import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { INTENT_CARDS } from "@/lib/discovery/intent-cards";
import { apiPost } from "@/lib/api/client";
import { projectNameFromPrompt } from "@/lib/ai/generate/name";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PENDING_PROMPT_KEY = "pagecrafts:pending-generate";
const AUTO_GENERATE_KEY = "pagecrafts:auto-generate";

interface GenerateJobResponse {
  job_id: string;
}

function looksLikeSignIn(message: string): boolean {
  return /sign in/i.test(message);
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
  const [error, setError] = useState<string | null>(null);

  async function startGeneration(text: string) {
    setBusy("generate");
    setError(null);

    const created = await apiPost<CreateProjectResponse>("/api/v1/projects", {
      name: projectNameFromPrompt(text),
      mode: "generate",
      prompt: text,
    });

    if (created.error || !created.data) {
      const message = created.error ?? "The site could not be created.";
      if (looksLikeSignIn(message)) {
        try {
          sessionStorage.setItem(PENDING_PROMPT_KEY, text);
          sessionStorage.setItem(AUTO_GENERATE_KEY, "1");
        } catch {
          // private mode can refuse storage; they can type it again after signing in
        }
        router.push("/#sign-in");
        return;
      }
      setError(message);
      setBusy(null);
      return;
    }

    const started = await apiPost<GenerateJobResponse>(
      `/api/v1/projects/${encodeURIComponent(created.data.id)}/generate`,
      { prompt: text },
    );

    if (started.error || !started.data) {
      setError(started.error ?? "The site could not be generated.");
      setBusy(null);
      return;
    }

    router.push(
      `/choose/${encodeURIComponent(created.data.id)}?job=${encodeURIComponent(started.data.job_id)}`,
    );
  }

  useLayoutEffect(() => {
    let pending = "";
    let auto = false;
    try {
      pending = sessionStorage.getItem(PENDING_PROMPT_KEY) ?? "";
      auto = sessionStorage.getItem(AUTO_GENERATE_KEY) === "1";
      if (pending) sessionStorage.removeItem(PENDING_PROMPT_KEY);
      if (auto) sessionStorage.removeItem(AUTO_GENERATE_KEY);
    } catch {
      return;
    }

    if (!pending) return;

    // set-state-in-effect is disabled here rather than worked around, because the pattern
    // it warns about is the right one for this case and the alternatives are worse.
    //
    // The brief lives in sessionStorage, which does not exist while the page is rendered on
    // the server. Reading it in a useState initialiser would make the server render an empty
    // textarea and the client render a full one — a hydration mismatch, traded for the one
    // extra render the rule is trying to save. useSyncExternalStore does not fit either: the
    // value is read once and deleted, so there is no stable snapshot to subscribe to.
    //
    // Restoring client-only state after mount is what React's own guidance suggests here,
    // and it costs exactly one additional render, once, on arrival from sign-in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescribe(pending);
    if (auto) void startGeneration(pending);
    // The pending brief is restored once, on arrival after sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    const text = describe.trim();
    if (!text) {
      setError("Describe the website you want, then generate.");
      return;
    }
    await startGeneration(text);
  }

  function pickCategory(category: Category) {
    setBusy(category);
    router.push(`/templates?category=${category}`);
  }

  const used = describe.length;

  return (
    <div className="flex flex-col gap-7">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/60 p-3.5 shadow-sm transition-colors focus-within:border-primary/50">
        <label htmlFor="describe" className="sr-only">
          Describe the website you want to build
        </label>
        <textarea
          id="describe"
          value={describe}
          onChange={(e) => {
            setDescribe(e.target.value);
            if (error) setError(null);
          }}
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
        {error && (
          <p role="alert" className="px-2 pt-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
        <span className="relative rounded-full border border-border bg-background px-4 py-1 text-xs font-medium text-muted-foreground">
          or start from a design
        </span>
      </div>

      <section className="flex flex-col gap-4">
        <header className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Choose a category</h2>
          <p className="text-sm text-muted-foreground">
            Browse a ready-made template instead of generating a new site
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
                "group flex flex-col gap-2.5 rounded-2xl border bg-card p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-ink transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            AI writes every page and its contents from your description — not a filtered template.
          </p>
        </div>
      )}
    </div>
  );
}
