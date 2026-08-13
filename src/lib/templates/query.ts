import type { Category, Template, TemplateTier } from "@/lib/contracts";
import { previewOf, type TemplatePreview } from "@/lib/discovery/preview";
import { toCategory } from "@/lib/discovery/categories";
import { COLOURS, FEATURES, LAYOUTS, TIERS } from "@/lib/discovery/filters";
import { toIntent, type IntentQuery } from "@/lib/discovery/ranking";
import { toSort, type SortKey } from "@/lib/discovery/sort";
import { rankTemplates } from "@/lib/ai/rank";
import { TEMPLATES } from "./index";
import { thumbnailUrlFor } from "./thumbnails";

// The gallery's query layer — what GET /templates answers with (D6).
//
// One place decides what a search of the library means: which designs match, in what order,
// and what a tile is told about each. The route handler serves it and the gallery page
// renders it, so a filter cannot behave one way over HTTP and another way on first paint.
//
// The library is still the module registry. The move to the `templates` table is a change
// to `source()` below and to nothing else — which is the point of putting the seam here
// rather than leaving the page importing TEMPLATES directly.

export type Colour = "light" | "dark";
export type Layout = "split" | "full-bleed" | "centered" | "showcase";

// What a design can do, derived from what it actually ships rather than from a tag someone
// remembered to add: a tag can lie about a feature, the markup cannot.
export type Feature = "form" | "list" | "photo";

export interface TemplateQuery {
    category?: Category;
    colour?: Colour;
    layout?: Layout;
    feature?: Feature;
    tier?: TemplateTier;
    /** Free text over name, description and tags. */
    q?: string;
    sort: SortKey;
    /** The classifier's attributes, when the person described their site. Ranks, never filters. */
    intent?: IntentQuery;
}

/** One tile's worth of a design. No file bodies — see TemplateDetail for why. */
export interface TemplateSummary {
    id: string;
    name: string;
    description: string;
    category: Category;
    tags: string[];
    tier: TemplateTier;
    priceInr: number;
    thumbnailUrl: string | null;
    colour: Colour;
    layout: Layout;
    features: Feature[];
    /** The miniature, parsed server-side so no file body crosses the wire. */
    preview: TemplatePreview;
    /** Deterministic relevance for this query. 0 when nothing was asked for. */
    score: number;
}

export type { SortKey };

export interface TemplateListResponse {
    items: TemplateSummary[];
    /** How many designs the library holds in total, before filters (the "N of M" line). */
    total: number;
}

// The accepted values live with the labels the chips wear (R2 D7), so the list this parses
// and the list a chip can produce are the same list. Two copies drift into a chip that sets
// a parameter the parser silently drops — the chip lights up, the URL changes, the grid
// does not move, and nothing reports a fault.
//
// The import is one-way at runtime: filters.ts takes only types from here, which erase.

const MAX_Q = 100;

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
    return typeof value === "string" && (allowed as readonly string[]).includes(value)
        ? (value as T)
        : undefined;
}

/**
 * Read a query out of untrusted search params.
 *
 * Every unrecognised value is dropped rather than rejected. A stale or hand-edited URL is
 * answered with a broader gallery, never with an error and never with an empty grid — the
 * same rule the category filter has followed since D3 (D-4, FR-035).
 */
export function parseTemplateQuery(params: {
    get(name: string): string | null;
}): TemplateQuery {
    const category = toCategory(params.get("category"));
    const colour = oneOf(COLOURS, params.get("colour"));
    const layout = oneOf(LAYOUTS, params.get("layout"));
    const feature = oneOf(FEATURES, params.get("feature"));
    const tier = oneOf(TIERS, params.get("tier"));
    const q = params.get("q")?.trim().slice(0, MAX_Q);
    const intent = toIntent({
        intent: params.get("intent"),
        tone: params.get("tone"),
        palette: params.get("palette"),
    });

    return {
        ...(category ? { category } : {}),
        ...(colour ? { colour } : {}),
        ...(layout ? { layout } : {}),
        ...(feature ? { feature } : {}),
        ...(tier ? { tier } : {}),
        ...(q ? { q } : {}),
        ...(intent ? { intent } : {}),
        sort: toSort(params.get("sort")),
    };
}

// Everything below reads the design's own files. A design cannot be filtered into a
// category of capability it does not have.

function colourOf(preview: TemplatePreview): Colour {
    const hex = preview.palette.bg.replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
        number,
        number,
        number,
    ];
    const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) < 0.5 ? "dark" : "light";
}

function featuresOf(template: Template, preview: TemplatePreview): Feature[] {
    const html = template.files["index.html"] ?? "";
    const hasList = template.contentSchema.sections.some((section) =>
        section.fields.some((field) => field.type === "list"),
    );

    return [
        ...(/<form\b/i.test(html) ? (["form"] as const) : []),
        ...(hasList ? (["list"] as const) : []),
        ...(preview.heroImage ? (["photo"] as const) : []),
    ];
}

function matchesText(template: Template, q: string): boolean {
    const haystack = `${template.name} ${template.description} ${template.tags.join(" ")}`.toLowerCase();
    // Every word has to appear somewhere. Two words should narrow, not widen.
    return q
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => haystack.includes(word));
}

const TIER_RANK: Record<TemplateTier, number> = { free: 0, premium: 1, signature: 2 };

/** Where the library comes from. Swapping to the `templates` table is a change here. */
function source(): Template[] {
    return TEMPLATES;
}

export function queryTemplates(query: TemplateQuery): TemplateListResponse {
    const library = source();

    const summaries = library.map((template) => {
        const preview = previewOf(template);
        return {
            template,
            preview,
            colour: colourOf(preview),
            layout: preview.layout as Layout,
            features: featuresOf(template, preview),
        };
    });

    const matched = summaries.filter(
        ({ template, colour, layout, features }) =>
            (!query.category || template.category === query.category) &&
            (!query.colour || colour === query.colour) &&
            (!query.layout || layout === query.layout) &&
            (!query.feature || features.includes(query.feature)) &&
            (!query.tier || template.tier === query.tier) &&
            (!query.q || matchesText(template, query.q)),
    );

    // The score is the deterministic tag overlap (D-5) and is attached to every item
    // whatever the sort, so a tile can say why it is where it is without being reordered.
    const scored = new Map(
        query.intent
            ? rankTemplates(
                  {
                      category: query.intent.category,
                      tone: query.intent.tone,
                      palette: query.intent.palette,
                  },
                  matched.map(({ template }) => template),
              ).map((t) => [t.id, t.score])
            : [],
    );

    const items: TemplateSummary[] = matched.map(({ template, preview, colour, layout, features }) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        tier: template.tier,
        priceInr: template.priceInr,
        // Null until the render pipeline exists — never a URL that 404s (thumbnails.ts).
        thumbnailUrl: thumbnailUrlFor(template),
        colour,
        layout,
        features,
        preview,
        score: scored.get(template.id) ?? 0,
    }));

    return { items: sortItems(items, query), total: library.length };
}

function sortItems(items: TemplateSummary[], query: TemplateQuery): TemplateSummary[] {
    const sorted = [...items];

    switch (query.sort) {
        case "free-first":
            return sorted.sort(
                (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.name.localeCompare(b.name),
            );
        case "premium-first":
            return sorted.sort(
                (a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.name.localeCompare(b.name),
            );
        case "name":
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case "recommended":
        default:
            // With something to recommend against, the deterministic score decides and ties
            // break by id so the order is total and a reload cannot reshuffle it. With
            // nothing, the library's own order stands.
            return query.intent
                ? sorted.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
                : sorted;
    }
}
