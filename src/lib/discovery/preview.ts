import type { Template } from "@/lib/contracts";
import { toMotifId } from "@/lib/templates/motifs";
import type { MotifId } from "@/lib/templates/motifs";

// A gallery tile shows a miniature of the design, not a generic placeholder. Rather than
// ship a screenshot per template (D16-D18) or run a live iframe (forbidden — D-3, AC-F3-2),
// the miniature is parsed out of the template's own source: its real navigation, hero copy,
// button label, layout and palette. A template can never look like something it is not.
//
// Parsing rather than reading the blueprint is deliberate — templates move to the API in
// week 2 (GET /templates), where all we will have is the files themselves.

export interface PreviewPalette {
    bg: string;
    ink: string;
    muted: string;
    accent: string;
    panel: string;
}

// Mirrors the template layouts in lib/templates/blueprint.ts.
export type PreviewLayout = "split" | "full-bleed" | "centered" | "showcase";

export interface TemplatePreview {
    wordmark: string;
    nav: string[];
    headline: string;
    subhead: string;
    cta: string;
    layout: PreviewLayout;
    motif: MotifId;
    // The hero photograph the tile shows, parsed from the template's own markup. Absent for
    // a design that ships none — the tile draws its motif instead.
    heroImage?: string;
    palette: PreviewPalette;
}

// The palette lands in an inline style, so only literal hex is accepted. Anything else
// (a var(), a function, anything surprising) falls back rather than reaching the DOM.
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const FALLBACK: PreviewPalette = {
    bg: "#ffffff",
    ink: "#171717",
    muted: "#6b7280",
    accent: "#4f46e5",
    panel: "#f4f4f5",
};

const LAYOUTS: PreviewLayout[] = ["split", "full-bleed", "centered", "showcase"];

const ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
};

function decodeEntities(text: string): string {
    return text.replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity);
}

function plainText(html: string): string {
    return decodeEntities(html.replace(/<[^>]*>/g, ""))
        .replace(/\s+/g, " ")
        .trim();
}

function rootVars(css: string): Record<string, string> {
    const block = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
    const vars: Record<string, string> = {};

    for (const declaration of block.split(";")) {
        const separator = declaration.indexOf(":");
        if (separator === -1) continue;
        const name = declaration.slice(0, separator).trim();
        const value = declaration.slice(separator + 1).trim();
        if (name.startsWith("--") && value) vars[name] = value;
    }

    return vars;
}

function hex(...candidates: (string | undefined)[]): string | undefined {
    return candidates.find((value) => value !== undefined && HEX.test(value));
}

export function paletteOf(css: string | undefined): PreviewPalette {
    if (!css) return FALLBACK;

    const vars = rootVars(css);
    // Templates name their surface either --bg (dark designs) or --paper (light ones).
    const bg = hex(vars["--bg"], vars["--paper"]) ?? FALLBACK.bg;
    const ink = hex(vars["--ink"]) ?? FALLBACK.ink;

    return {
        bg,
        ink,
        muted: hex(vars["--muted"], vars["--rule"]) ?? ink,
        accent: hex(vars["--accent"]) ?? ink,
        panel: hex(vars["--panel"], vars["--rule"]) ?? bg,
    };
}

function textOf(html: string, pattern: RegExp): string {
    return plainText(html.match(pattern)?.[1] ?? "");
}

function navLabels(html: string): string[] {
    const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i)?.[1] ?? "";
    return [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
        .map((match) => plainText(match[1] ?? ""))
        .filter(Boolean)
        .slice(0, 5);
}

function layoutOf(html: string): PreviewLayout {
    const declared = html.match(/<body\b[^>]*\bdata-layout="([^"]+)"/i)?.[1];
    return LAYOUTS.find((layout) => layout === declared) ?? "split";
}

// The hero photograph's URL, taken from the hero.image slot. Only absolute http(s) URLs
// are accepted — the value lands in an <img src>, so anything else (a data:, a relative
// path, anything surprising) is dropped and the tile falls back to the motif.
function heroImageOf(html: string): string | undefined {
    const frame = html.match(/data-slot="hero\.image"[\s\S]*?<\/div>/i)?.[0] ?? "";
    const raw = frame.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
    // Decoded, because this is being lifted out of *markup*: an ampersand in an attribute is
    // written `&amp;`, so a photo authored as `?w=1600&q=70&auto=format&fit=crop` arrives
    // here as `?w=1600&amp;q=70&amp;...`. Passing that on treated `amp;q` as a parameter
    // name, and `new URL().toString()` then percent-encoded the semicolon in it — so the
    // gallery asked Unsplash for `w` and three parameters it has never heard of. `q=70`,
    // `auto=format` and `fit=crop` were all silently dropped from all 115 tiles: measured on
    // one of the library's own photographs, 47.6 KB of JPEG where the intended URL returns
    // 29.6 KB of AVIF (R2 D18).
    const src = raw ? decodeEntities(raw) : undefined;
    return src && /^https:\/\//i.test(src) ? src : undefined;
}

export function previewOf(template: Template): TemplatePreview {
    const html = template.files["index.html"] ?? "";
    const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const afterHeading = headingMatch
        ? html.slice((headingMatch.index ?? 0) + headingMatch[0].length)
        : "";

    // The template's own words where it has them; its catalogue entry where it does not.
    const headline = plainText(headingMatch?.[1] ?? "") || template.name;
    const subhead =
        plainText(afterHeading.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "") ||
        template.description;

    return {
        wordmark: textOf(html, /<[^>]*class="wordmark"[^>]*>([\s\S]*?)<\//i) || template.name,
        nav: navLabels(html),
        headline,
        subhead,
        cta: textOf(html, /<a\b[^>]*class="cta"[^>]*>([\s\S]*?)<\/a>/i),
        layout: layoutOf(html),
        motif: toMotifId(html.match(/data-motif="([^"]+)"/i)?.[1]),
        heroImage: heroImageOf(html),
        palette: paletteOf(template.files["styles.css"]),
    };
}
