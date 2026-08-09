import { Sparkles } from "lucide-react";

import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { toCategory } from "@/lib/discovery/categories";
import { IntentCapture } from "@/components/discovery/IntentCapture";
import { PagecraftFeatures } from "@/components/discovery/PagecraftFeatures";

// Screen 03 — "What are you trying to build?" (step 1 of the funnel). Neither input is
// required: describing the site or picking a category card routes to the gallery, and both
// empty shows every template.
//
// Arriving with `q`/`category` means the user came back from the gallery to edit what they
// said, so the form opens on exactly what it sent — never a blank page.
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-10 pt-4">
      <header className="flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden
          className="brand-halo flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-accent/60 text-primary"
        >
          <Sparkles className="size-5" strokeWidth={1.75} />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          What are you trying to <span className="text-primary">build</span>?
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Describe your idea in a few words and let AI create the perfect website for you.
        </p>
      </header>

      <IntentCapture
        initialDescribe={q?.slice(0, MAX_CLASSIFY_CHARS) ?? ""}
        initialCategory={toCategory(category) ?? null}
      />

      <PagecraftFeatures />
    </main>
  );
}
