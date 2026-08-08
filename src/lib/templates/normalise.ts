import type {
    Category,
    ContentSchema,
    ContentSection,
    Field,
    FieldType,
    FileMap,
    Template,
    TemplateTier,
} from "@/lib/contracts";
import { validateTemplate } from "./index";

// The normaliser — the front door of the template grind (D4).
//
// Sourcing 25 designs by hand is the bottleneck of R2, and a hand-normalised template is
// where provenance and schema drift creep in. So a source never becomes a library entry by
// being typed out: it is fed through here, which does four things and refuses to guess at
// any of them quietly:
//
//   1. enforces provenance — no verified licence + source_url, no record (C-06);
//   2. drafts `content_schema` by reading the markup's own `data-slot` attributes, so the
//      schema and the slots cannot disagree — that parity is what makes the content panel
//      zero-per-template (C-07);
//   3. infers a category and tags from the design's own words when the source does not
//      declare them, so ranking has something to bite on (D-5);
//   4. runs the same validateTemplate() the registry is held to, so a normalised record is
//      valid by construction or it is not a record at all.
//
// Blueprint-authored designs (lib/templates/blueprint.ts) go the other way — generated from
// a spec. Both roads have to arrive at the same shape, and tests hold them to it.

export interface SourceTemplate {
    id: string;
    name: string;
    description?: string;
    /** Declared category. Inferred from the design's own copy when absent. */
    category?: Category;
    /** Declared tags. Topped up from the design's copy, palette and layout. */
    tags?: string[];
    /** Defaults to `free`: a design is only priced when someone says so. */
    tier?: TemplateTier;
    /** Non-null, both of them. This is the C-06 gate. */
    license: string;
    sourceUrl: string;
    files: FileMap;
}

export type NormaliseResult =
    | { ok: true; template: Template; warnings: string[] }
    | { ok: false; issues: string[] };

const TIER_PRICE_INR: Record<TemplateTier, number> = { free: 0, premium: 499, signature: 999 };
const TIERS: readonly TemplateTier[] = ["free", "premium", "signature"];

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Captures the element a slot sits on as well as the slot itself: the tag is a signal for
// the field type (an <img> is an image slot however its key is spelled).
const SLOT_RE = /<([a-z0-9]+)\b([^>]*?)\sdata-slot="([^"]+)"/gi;

// `<section>.<field>` for a plain field, `<section>.<field>.<index>.<key>` for one item of
// a repeatable list. Anything deeper has no field to bind to and is rejected.
const LIST_SLOT_RE = /^([a-z0-9_]+)\.(\d+)\.([a-z0-9_]+)$/i;

const IMAGE_KEY_RE = /^(image|photo|picture|logo|banner|cover|avatar|favicon|og_image)$/i;
const COLOR_KEY_RE = /^(colour|color|accent)$/i;
const RICHTEXT_KEY_RE = /^(body|about|description|intro|bio|content|blurb)$/i;

// Length caps by field key, mirroring the hand-authored blueprints so a normalised design
// and a generated one hold their copy to the same limits. Item fields are tighter: they sit
// in a card, not a column.
const SECTION_MAX_LENGTH: Record<string, number> = {
    headline: 60,
    heading: 60,
    title: 60,
    subhead: 140,
    subheading: 140,
    cta: 24,
    button: 24,
    name: 40,
    footer: 120,
};
const ITEM_MAX_LENGTH: Record<string, number> = {
    title: 40,
    heading: 40,
    body: 160,
    caption: 160,
};

// Keyword vocabulary, used for both jobs: the best-scoring category becomes the design's
// category, and the words that actually matched become tags. Deliberately small and
// deterministic — no embeddings anywhere in ranking or sourcing (D-5).
const CATEGORY_KEYWORDS: Partial<Record<Category, string[]>> = {
    fitness: ["gym", "workout", "training", "trainer", "fitness", "strength", "class"],
    food: ["menu", "restaurant", "cafe", "coffee", "kitchen", "bakery", "dish", "brunch", "dining"],
    portfolio: ["portfolio", "selected work", "designer", "freelance", "case study"],
    photography: ["photography", "photographer", "shoot", "gallery", "portrait", "camera"],
    blog: ["blog", "posts", "article", "writing", "newsletter", "essay"],
    resume: ["resume", "cv", "experience", "skills", "hire me"],
    architecture: ["architecture", "architect", "studio", "interior", "built", "practice"],
    education: ["school", "students", "admissions", "course", "teachers", "academy", "learning"],
    travel: ["travel", "tour", "trip", "destination", "itinerary", "stay", "guide"],
    agency: ["agency", "clients", "services", "campaign", "brand", "team"],
    business: ["consulting", "consultant", "business", "advisory", "solutions", "enterprise"],
    event: ["event", "conference", "tickets", "speakers", "schedule", "venue", "wedding"],
    store: ["shop", "store", "product", "cart", "buy", "collection"],
    nonprofit: ["donate", "charity", "volunteer", "nonprofit", "cause", "fundraise"],
    saas: ["saas", "platform", "dashboard", "pricing plan", "free trial", "integrations"],
};

// A few keys whose humanised spelling reads like machinery ("Cta") rather than like an
// instruction. Everything else is humanised from the key, which is why keys are named for
// what the person is editing and not for where it sits in the markup.
const LABELS: Record<string, string> = {
    cta: "Button label",
    subhead: "Subheading",
    subheading: "Subheading",
    footer: "Footer note",
    og_image: "Social image",
};

function humanise(key: string): string {
    const words = key.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function labelFor(key: string): string {
    return LABELS[key.toLowerCase()] ?? humanise(key);
}

function stripTags(html: string): string {
    return html
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

// Relative luminance of a hex colour, used only to decide whether a design reads dark or
// light. Malformed values simply produce no tone tag rather than throwing.
function toneOf(css: string): "dark" | "light" | undefined {
    const hex = /--bg:\s*#([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(css)?.[1];
    if (!hex) return undefined;

    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
        number,
        number,
        number,
    ];
    const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) < 0.5
        ? "dark"
        : "light";
}

function scoreCategories(text: string): { category: Category; score: number; hits: string[] }[] {
    const scored = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => {
        const hits = keywords!.filter((word) => text.includes(word));
        return { category: category as Category, score: hits.length, hits };
    });

    return scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
}

function fieldTypeFor(
    key: string,
    tag: string,
    attrs: string,
    scope: "section" | "item",
): FieldType {
    if (tag.toLowerCase() === "img" || /<img\b/i.test(attrs) || IMAGE_KEY_RE.test(key)) {
        return "image";
    }
    if (COLOR_KEY_RE.test(key)) return "color";
    if (/\sdata-options="/i.test(attrs)) return "select";
    // Long-form prose is only long-form at section level; the same key inside a card is a
    // one-liner, and giving it a rich-text editor would be a lie about the space available.
    if (scope === "section" && RICHTEXT_KEY_RE.test(key)) return "richtext";
    return "text";
}

function optionsFor(attrs: string): string[] | undefined {
    const raw = /\sdata-options="([^"]*)"/i.exec(attrs)?.[1];
    if (!raw) return undefined;
    const options = raw.split("|").map((o) => o.trim()).filter(Boolean);
    return options.length > 0 ? options : undefined;
}

function buildField(
    key: string,
    tag: string,
    attrs: string,
    scope: "section" | "item",
): Field {
    const type = fieldTypeFor(key, tag, attrs, scope);
    const maxLength = (scope === "item" ? ITEM_MAX_LENGTH : SECTION_MAX_LENGTH)[key.toLowerCase()];
    const options = type === "select" ? optionsFor(attrs) : undefined;

    return {
        key,
        label: labelFor(key),
        type,
        ...(options ? { options } : {}),
        ...(maxLength !== undefined && (type === "text" || type === "richtext")
            ? { maxLength }
            : {}),
    };
}

interface DraftedSchema {
    schema: ContentSchema;
    issues: string[];
}

/**
 * Draft a `content_schema` from a template's own markup.
 *
 * Sections appear in the order they are first met in the document, which is the order the
 * visitor meets them on the page — with one exception: `site` is pinned last, because it is
 * page-wide chrome (the wordmark in the header, the footer note) rather than a band of the
 * page, and it would otherwise lead the panel purely because the header is at the top.
 */
export function draftContentSchema(html: string): DraftedSchema {
    const issues: string[] = [];
    const order: string[] = [];
    const sections = new Map<string, Map<string, Field>>();
    const lists = new Map<string, Map<string, Field>>();

    const sectionOf = (key: string): Map<string, Field> => {
        if (!sections.has(key)) {
            sections.set(key, new Map());
            order.push(key);
        }
        return sections.get(key)!;
    };

    for (const match of html.matchAll(SLOT_RE)) {
        const [, tag = "", attrs = "", slot = ""] = match;
        const [sectionKey, ...rest] = slot.split(".");

        if (!sectionKey || rest.length === 0) {
            issues.push(`slot "${slot}" needs a section: use "<section>.<field>"`);
            continue;
        }

        const path = rest.join(".");
        const listMatch = LIST_SLOT_RE.exec(path);

        if (listMatch) {
            const [, fieldKey = "", , itemKey = ""] = listMatch;
            const listKey = `${sectionKey}.${fieldKey}`;
            if (!lists.has(listKey)) lists.set(listKey, new Map());
            const items = lists.get(listKey)!;
            if (!items.has(itemKey)) items.set(itemKey, buildField(itemKey, tag, attrs, "item"));

            const fields = sectionOf(sectionKey);
            if (!fields.has(fieldKey)) {
                fields.set(fieldKey, {
                    key: fieldKey,
                    label: labelFor(fieldKey),
                    type: "list",
                    itemSchema: [],
                });
            }
            continue;
        }

        if (rest.length > 1) {
            issues.push(
                `slot "${slot}" nests too deep: only "<section>.<field>" and ` +
                `"<section>.<list>.<index>.<key>" bind to a field`,
            );
            continue;
        }

        const fields = sectionOf(sectionKey);
        if (!fields.has(path)) fields.set(path, buildField(path, tag, attrs, "section"));
    }

    // Every item of a list contributes its keys, so a list whose first card omits an
    // optional field still gets that field in its item schema.
    for (const [listKey, items] of lists) {
        const [sectionKey = "", fieldKey = ""] = listKey.split(".");
        const field = sections.get(sectionKey)?.get(fieldKey);
        if (field) field.itemSchema = [...items.values()];
    }

    const ordered = [...order.filter((key) => key !== "site"), ...order.filter((key) => key === "site")];

    const built: ContentSection[] = ordered.map((key) => ({
        key,
        label: humanise(key),
        fields: [...sections.get(key)!.values()],
    }));

    if (built.length === 0) {
        issues.push('no editable slots found: the markup needs data-slot="<section>.<field>"');
    }

    return { schema: { sections: built }, issues };
}

/**
 * Turn a sourced template into a schema-valid library record, or refuse it with reasons.
 *
 * Refusal is the point as much as conversion: a source with no verified licence is not a
 * template with a gap, it is not a template (C-06).
 */
export function normaliseTemplate(source: SourceTemplate): NormaliseResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    const id = source.id?.trim() ?? "";
    const name = source.name?.trim() ?? "";
    const license = source.license?.trim() ?? "";
    const sourceUrl = source.sourceUrl?.trim() ?? "";

    if (!id) issues.push("id is required");
    else if (!ID_RE.test(id)) issues.push(`id "${id}" must be kebab-case (a-z, 0-9, hyphens)`);
    if (!name) issues.push("name is required");

    // The C-06 gate. Stated in the same words the reviewer will use in the week-4 audit.
    if (!license) issues.push("license is required (C-06): a source with no verified licence is not a template");
    if (!sourceUrl) issues.push("source_url is required (C-06): provenance must point somewhere");

    const tier = source.tier ?? "free";
    if (!TIERS.includes(tier)) issues.push(`invalid tier: ${tier}`);
    if (!source.tier) warnings.push("no tier declared — recorded as free");

    const files = source.files ?? {};
    const html = files["index.html"] ?? "";
    const css = files["styles.css"] ?? "";
    if (!html.trim()) issues.push("index.html is required: it is what the schema is drafted from");

    const { schema, issues: schemaIssues } = draftContentSchema(html);
    issues.push(...schemaIssues);

    const prose = `${name} ${source.description ?? ""} ${(source.tags ?? []).join(" ")} ${stripTags(html)}`.toLowerCase();
    const ranked = scoreCategories(prose);

    let category = source.category;
    if (!category) {
        category = ranked[0]?.category ?? "other";
        warnings.push(
            ranked[0]
                ? `category inferred as "${category}" from the design's own copy — confirm it`
                : 'no category could be inferred — recorded as "other"; set one before it ships',
        );
    }

    const tone = toneOf(css);
    if (!css.trim()) warnings.push("no styles.css — palette and tone tags could not be inferred");

    const layout = /data-layout="([a-z-]+)"/i.exec(html)?.[1];
    const declared = (source.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const inferred = ranked.flatMap((entry) => entry.hits).map((hit) => hit.replace(/\s+/g, "-"));

    const tags = [...new Set([category, ...declared, ...(tone ? [tone] : []), ...(layout ? [layout] : []), ...inferred])]
        .filter(Boolean)
        .slice(0, 6);

    if (declared.length === 0) warnings.push(`tags inferred: ${tags.join(", ")}`);

    const template: Template = {
        id,
        name,
        description: source.description?.trim() || name,
        category,
        tags,
        thumbnailUrl: `/templates/${id}/thumbnail.png`,
        files,
        contentSchema: schema,
        license,
        sourceUrl,
        tier,
        priceInr: TIER_PRICE_INR[tier] ?? 0,
    };

    // The record is held to exactly the bar the registry is held to — one gate, not two.
    issues.push(...validateTemplate(template));

    return issues.length > 0
        ? { ok: false, issues: [...new Set(issues)] }
        : { ok: true, template, warnings };
}
