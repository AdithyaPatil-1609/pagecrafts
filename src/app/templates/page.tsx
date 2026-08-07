import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { TEMPLATES } from "@/lib/templates";
import { filterByCategory, toCategory } from "@/lib/discovery/categories";
import { sortTemplates, toSort } from "@/lib/discovery/sort";
import { GalleryGrid } from "@/components/discovery/GalleryGrid";
import { PromptEcho } from "@/components/discovery/PromptEcho";

// Screen 04 — the gallery. On stub data (the local template registry) for now; wires to
// GET /templates in week 2 (D6). The category from the URL pre-filters the grid, so the
// intent screen's choice carries straight through (D-4). Unknown values are ignored.
//
// `q` carries the user's own description across from screen 03 purely so it can be shown
// back to them and edited. Nothing is filtered on it — the classifier already turned it
// into a category — so a strange value can only ever be echoed, never trusted.
function toPrompt(value: string | undefined): string | undefined {
  const text = value?.trim().slice(0, MAX_CLASSIFY_CHARS);
  return text ? text : undefined;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}) {
  const { category, sort, q } = await searchParams;
  const active = toCategory(category);
  const activeSort = toSort(sort);
  const prompt = toPrompt(q);
  const templates = sortTemplates(filterByCategory(TEMPLATES, active), activeSort);

  // Everything except `sort` itself, so changing the order keeps the rest of the URL.
  const preserve: Record<string, string> = {
    ...(active ? { category: active } : {}),
    ...(prompt ? { q: prompt } : {}),
  };
  const editHref = `/new?${new URLSearchParams(preserve).toString()}`;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-16 pt-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {prompt ? "Here are designs for your site" : "Choose a design"}
        </h1>
        <p className="text-muted-foreground">
          {prompt
            ? "Choose a design you love. You can customize it in the next step."
            : "Every design is free to edit — you only pay when you go live."}
        </p>
        {prompt && <PromptEcho text={prompt} editHref={editHref} />}
      </header>

      <GalleryGrid
        templates={templates}
        activeCategory={active}
        sort={activeSort}
        preserve={preserve}
        personalised={Boolean(prompt || active)}
      />
    </main>
  );
}
