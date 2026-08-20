import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { intentParams } from "@/lib/discovery/ranking";
import { parseTemplateQuery, queryTemplates, type TemplateQuery } from "@/lib/templates/query";
import { DEFAULT_SORT } from "@/lib/discovery/sort";
import { FilterChips } from "@/components/discovery/FilterChips";
import { GalleryGrid } from "@/components/discovery/GalleryGrid";
import { GalleryError } from "@/components/discovery/GalleryStates";
import { PromptEcho } from "@/components/discovery/PromptEcho";

// Screen 04 — the gallery, on the live query (D6).
//
// The page and GET /templates read the library through one function, lib/templates/query.ts:
// the filters, the deterministic order and the shape of a tile are decided in one place, so
// a filter cannot mean one thing over HTTP and another on first paint. The endpoint is what
// the filter chips will call as they change (D7); this first render goes straight through
// the query layer instead of the app making an HTTP request to itself.
//
// Two things arrive from the intent screen and are handled differently (D5): `category` is
// a card the person pressed and filters; `intent` (+ `tone`, `palette`) is what the
// classifier made of their description and only reorders.
//
// `q` carries the description across so it can be shown back and edited. It is also a real
// text filter now — but only over a design's own name, description and tags, so a strange
// value narrows the grid and can never reach anything else.

function toPrompt(value: string | undefined): string | undefined {
  const text = value?.trim().slice(0, MAX_CLASSIFY_CHARS);
  return text ? text : undefined;
}

type Params = Record<string, string | string[] | undefined>;

function searchParamsOf(params: Params): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") search.set(key, value);
  }
  return search;
}

/**
 * The params the query layer gets, which are not quite the params in the address bar.
 *
 * `q` means two different things on the two sides of this line, and conflating them breaks
 * the funnel. In the URL it is the sentence the person typed on the describe screen — it is
 * echoed back to them and turned into a ranking, and it is explicitly not a filter (D5). To
 * GET /templates it is a text search over a design's name, description and tags.
 *
 * Feeding the first into the second filters the library by every word of a sentence:
 * "a small online shop" left exactly one design on screen where thirteen belonged. So the
 * description is dropped here, and the gallery's own search box — which arrives with the
 * filter chips at D7 — will travel as `search`.
 */
function queryParamsOf(search: URLSearchParams): URLSearchParams {
  const forQuery = new URLSearchParams(search);
  forQuery.delete("q");

  const text = search.get("search");
  if (text) forQuery.set("q", text);

  return forQuery;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const search = searchParamsOf(params);
  const query = parseTemplateQuery(queryParamsOf(search));
  const prompt = toPrompt(typeof params.q === "string" ? params.q : undefined);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-16 pt-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {prompt ? "Here are designs for your site" : "Choose a design"}
        </h1>
        <p className="text-muted-foreground">
          {prompt
            ? "Closest matches first. Choose a design — Edit opens it in the editor."
            : "Every design is free to edit — you only pay when you go live."}
        </p>
        {prompt && (
          <PromptEcho
            text={prompt}
            editHref={`/new?${new URLSearchParams({
              ...(query.category ? { category: query.category } : {}),
              q: prompt,
            }).toString()}`}
          />
        )}
      </header>

      <Gallery query={query} prompt={prompt} search={search} />
    </main>
  );
}

// Reading the library is the part that can fail, so it is the part inside the try/catch.
// Today it is a module read; when it becomes a table the error state is already in place.
// The loading state is the route's own loading.tsx — see the note there for why it is not a
// Suspense boundary around this component.
async function Gallery({
  query,
  prompt,
  search,
}: {
  query: TemplateQuery;
  prompt: string | undefined;
  search: URLSearchParams;
}) {
  let result;
  try {
    result = await Promise.resolve(queryTemplates(query));
  } catch (error) {
    console.error("[gallery] could not read the library", error);
    return <GalleryError retryHref={`/templates?${search.toString()}`} />;
  }

  // Everything except `sort`, so changing the order keeps the rest of the URL — and keeps
  // the ranking, which would otherwise be lost the moment someone sorted by name.
  const preserve: Record<string, string> = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.colour ? { colour: query.colour } : {}),
    ...(query.layout ? { layout: query.layout } : {}),
    ...(query.feature ? { feature: query.feature } : {}),
    ...(query.tier ? { tier: query.tier } : {}),
    ...(prompt ? { q: prompt } : {}),
    ...(query.q ? { search: query.q } : {}),
    ...intentParams(query.intent),
  };

  // What a chip carries, which is `preserve` plus the sort (R2 D7). The two differ by
  // exactly one parameter and for opposite reasons: the sort control must not re-send the
  // sort it is replacing, and a chip must not throw away the order someone chose. Building
  // the chip map out of `preserve` rather than beside it keeps the other seven parameters
  // from having to be remembered twice.
  //
  // The default order stays out of the URL, so an unsorted gallery has a clean address.
  const chipPreserve: Record<string, string> = {
    ...preserve,
    ...(query.sort !== DEFAULT_SORT ? { sort: query.sort } : {}),
  };

  return (
    <>
      <FilterChips query={query} preserve={chipPreserve} resetHref="/templates" />
      <GalleryGrid
        templates={result.items}
        total={result.total}
        activeCategory={query.category}
        sort={query.sort}
        preserve={preserve}
        personalised={Boolean(prompt || query.category || query.intent)}
        resetHref="/templates"
        ranked={query.sort === "recommended" && Boolean(query.intent)}
      />
    </>
  );
}
