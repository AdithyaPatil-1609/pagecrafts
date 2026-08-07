import type { Template } from "@/lib/contracts";

// A gallery tile shows a miniature of the design, not a generic placeholder. Rather than
// ship a screenshot per template (D16-D18) or run a live iframe (forbidden — D-3, AC-F3-2),
// the miniature is drawn from the template's own source: the real hero copy and the real
// palette from its stylesheet. A template can never look like something it is not.

export interface PreviewPalette {
    bg: string;
    ink: string;
    muted: string;
    accent: string;
}

// How the miniature arranges itself. Derived from the template's tags so a gallery
// template reads as a gallery at thumbnail size, and an editorial one reads as editorial.
export type PreviewShape = "split" | "gallery" | "editorial";

export interface TemplatePreview {
    headline: string;
    subhead: string;
    palette: PreviewPalette;
    shape: PreviewShape;
}

// The palette lands in an inline style, so only literal hex is accepted. Anything else
// (a var(), a function, anything surprising) falls back rather than reaching the DOM.
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const FALLBACK: PreviewPalette = {
    bg: "#ffffff",
    ink: "#171717",
    muted: "#6b7280",
    accent: "#4f46e5",
};

const ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
};

function plainText(html: string): string {
    return html
        .replace(/<[^>]*>/g, "")
        .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
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
    };
}

function shapeOf(tags: string[]): PreviewShape {
    const set = new Set(tags);
    if (set.has("grid") || set.has("products")) return "gallery";
    if (set.has("editorial") || set.has("reading") || set.has("print-friendly")) {
        return "editorial";
    }
    return "split";
}

export function previewOf(template: Template): TemplatePreview {
    const html = template.files["index.html"] ?? "";
    const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const afterHeading = headingMatch
        ? html.slice((headingMatch.index ?? 0) + headingMatch[0].length)
        : "";
    const subheadMatch = afterHeading.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);

    // The template's own words where it has them; its catalogue entry where it does not.
    const headline = plainText(headingMatch?.[1] ?? "") || template.name;
    const subhead = plainText(subheadMatch?.[1] ?? "") || template.description;

    return {
        headline,
        subhead,
        palette: paletteOf(template.files["styles.css"]),
        shape: shapeOf(template.tags),
    };
}
