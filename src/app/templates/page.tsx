import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { TEMPLATES } from "@/lib/templates";
import { filterByCategory, toCategory } from "@/lib/discovery/categories";
import { intentParams, rankForIntent, toIntent } from "@/lib/discovery/ranking";
import { sortTemplates, toSort } from "@/lib/discovery/sort";
import { GalleryGrid } from "@/components/discovery/GalleryGrid";
import { PromptEcho } from "@/components/discovery/PromptEcho";

// Screen 04 — the gallery. On stub data (the local template registry) for now; wires to
// GET /templates in week 2 (D6).
//
// Two things can arrive from the intent screen and they are handled differently (D5):
//
//   `category` — a card the person pressed. A filter: they asked for one kind of design.
//   `intent` (+ `tone`, `palette`) — what the classifier made of their description. A
//     ranking: the best matches lead and the whole library still shows (D-6, and the D5
//     milestone's "ten real templates" only means anything if they are all on the screen).
//
// `q` carries the user's own description across purely so it can be shown back to them and
// edited. Nothing is filtered on it — the classifier already turned it into attributes — so
// a strange value can only ever be echoed, never trusted.
function toPrompt(value: string | undefined): string | undefined {
  const text = value?.trim().slice(0, MAX_CLASSIFY_CHARS);
  return text ? text : undefined;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    q?: string;
    intent?: string;
    tone?: string;
    palette?: string;
  }>;
}) {
  const { category, sort, q, intent, tone, palette } = await searchParams;
  const active = toCategory(category);
  const wanted = toIntent({ intent, tone, palette });
  const activeSort = toSort(sort);
  const prompt = toPrompt(q);

  const shortlist = filterByCategory(TEMPLATES, active);

  // "Recommended" means the library's own order until there is something to recommend
  // against; then it means the deterministic score for what was described. Picking any
  // other sort is an explicit instruction and outranks the ranking.
  const templates =
    activeSort === "recommended" && wanted
      ? rankForIntent(shortlist, wanted)
      : sortTemplates(shortlist, activeSort);

  // Everything except `sort` itself, so changing the order keeps the rest of the URL — and
  // keeps the ranking, which would otherwise be lost the moment someone sorted by name and
  // switched back.
  const preserve: Record<string, string> = {
    ...(active ? { category: active } : {}),
    ...(prompt ? { q: prompt } : {}),
    ...intentParams(wanted),
  };

  // Back to the describe screen with what they said, so editing it is not retyping it.
  const editParams = new URLSearchParams({
    ...(active ? { category: active } : {}),
    ...(prompt ? { q: prompt } : {}),
  });
  const editHref = `/new?${editParams.toString()}`;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-16 pt-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {prompt ? "Here are designs for your site" : "Choose a design"}
        </h1>
        <p className="text-muted-foreground">
          {prompt
            ? "Closest matches first. Choose a design you love — you can customize it in the next step."
            : "Every design is free to edit — you only pay when you go live."}
        </p>
        {prompt && <PromptEcho text={prompt} editHref={editHref} />}
      </header>

      <GalleryGrid
        templates={templates}
        activeCategory={active}
        sort={activeSort}
        preserve={preserve}
        personalised={Boolean(prompt || active || wanted)}
      />
    </main>
  );
}
