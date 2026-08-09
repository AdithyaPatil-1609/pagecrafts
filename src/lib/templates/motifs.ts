// Hero artwork for the template library, drawn in code rather than shipped as photos:
// nothing to license (C-06), nothing to fetch, and a preview that is byte-identical to
// what the published site renders.
//
// A motif is declared once as data. Two renderers consume it — `motifToSvg` for the
// template's own index.html, and the React one in TemplatePreview for the gallery tile —
// so the miniature can never drift from the design it advertises.

export type PaletteRole = "ink" | "muted" | "accent" | "panel" | "bg";

interface Paint {
    fill?: PaletteRole;
    stroke?: PaletteRole;
    strokeWidth?: number;
    opacity?: number;
}

export type MotifShape =
    | ({ kind: "circle"; cx: number; cy: number; r: number } & Paint)
    | ({ kind: "rect"; x: number; y: number; width: number; height: number; rx?: number } & Paint)
    | ({ kind: "path"; d: string } & Paint);

export interface Motif {
    viewBox: string;
    shapes: MotifShape[];
}

export type MotifId =
    | "arcs"
    | "ember"
    | "chart"
    | "orbit"
    | "rules"
    | "marquee"
    | "sheet"
    | "awning"
    | "lantern"
    | "frame";

// Every motif is drawn in a 100×60 field and stretched to fill its hero.
const FIELD = "0 0 100 60";

export const MOTIFS: Record<MotifId, Motif> = {
    // Portfolio — light sweeping over a horizon.
    arcs: {
        viewBox: FIELD,
        shapes: [
            { kind: "circle", cx: 74, cy: 22, r: 11, fill: "accent", opacity: 0.9 },
            { kind: "path", d: "M2 52 Q 30 18 62 40 T 98 26", stroke: "accent", strokeWidth: 2, opacity: 0.7 },
            { kind: "path", d: "M2 58 Q 34 28 66 46 T 98 34", stroke: "muted", strokeWidth: 1.5, opacity: 0.5 },
            { kind: "rect", x: 0, y: 52, width: 100, height: 8, fill: "accent", opacity: 0.18 },
        ],
    },
    // Restaurant — a plate and the heat under it.
    ember: {
        viewBox: FIELD,
        shapes: [
            { kind: "circle", cx: 50, cy: 30, r: 20, fill: "panel", opacity: 0.9 },
            { kind: "circle", cx: 50, cy: 30, r: 13, fill: "accent", opacity: 0.35 },
            { kind: "path", d: "M50 40 C 42 32 46 24 50 18 C 54 24 58 32 50 40 Z", fill: "accent" },
            { kind: "circle", cx: 20, cy: 46, r: 4, fill: "accent", opacity: 0.5 },
            { kind: "circle", cx: 82, cy: 16, r: 5, fill: "accent", opacity: 0.35 },
        ],
    },
    // SaaS — the number going up and to the right.
    chart: {
        viewBox: FIELD,
        shapes: [
            { kind: "rect", x: 12, y: 36, width: 12, height: 20, rx: 2, fill: "accent", opacity: 0.35 },
            { kind: "rect", x: 30, y: 28, width: 12, height: 28, rx: 2, fill: "accent", opacity: 0.55 },
            { kind: "rect", x: 48, y: 20, width: 12, height: 36, rx: 2, fill: "accent", opacity: 0.75 },
            { kind: "rect", x: 66, y: 10, width: 12, height: 46, rx: 2, fill: "accent" },
            { kind: "path", d: "M14 34 L 36 26 L 54 18 L 72 8", stroke: "ink", strokeWidth: 1.5, opacity: 0.5 },
        ],
    },
    // Agency — things in motion around a centre.
    orbit: {
        viewBox: FIELD,
        shapes: [
            { kind: "circle", cx: 50, cy: 30, r: 10, fill: "accent" },
            { kind: "path", d: "M50 4 A 26 26 0 1 1 49.9 4 Z", stroke: "accent", strokeWidth: 1.2, opacity: 0.45 },
            { kind: "path", d: "M8 30 Q 50 -6 92 30 Q 50 66 8 30 Z", stroke: "muted", strokeWidth: 1.2, opacity: 0.5 },
            { kind: "circle", cx: 86, cy: 22, r: 3.5, fill: "accent", opacity: 0.9 },
            { kind: "circle", cx: 16, cy: 40, r: 2.5, fill: "muted", opacity: 0.8 },
        ],
    },
    // Blog — a column of set text with a drop cap.
    rules: {
        viewBox: FIELD,
        shapes: [
            { kind: "rect", x: 14, y: 12, width: 14, height: 14, rx: 1, fill: "accent", opacity: 0.85 },
            { kind: "rect", x: 34, y: 13, width: 52, height: 3, rx: 1.5, fill: "ink", opacity: 0.55 },
            { kind: "rect", x: 34, y: 21, width: 44, height: 3, rx: 1.5, fill: "muted", opacity: 0.55 },
            { kind: "rect", x: 14, y: 34, width: 72, height: 3, rx: 1.5, fill: "muted", opacity: 0.45 },
            { kind: "rect", x: 14, y: 42, width: 64, height: 3, rx: 1.5, fill: "muted", opacity: 0.35 },
            { kind: "rect", x: 14, y: 50, width: 30, height: 3, rx: 1.5, fill: "accent", opacity: 0.7 },
        ],
    },
    // Event — a lit sign over a crowd.
    marquee: {
        viewBox: FIELD,
        shapes: [
            { kind: "rect", x: 18, y: 10, width: 64, height: 24, rx: 3, fill: "panel", opacity: 0.85 },
            { kind: "circle", cx: 26, cy: 8, r: 3, fill: "accent" },
            { kind: "circle", cx: 42, cy: 6, r: 3, fill: "accent", opacity: 0.8 },
            { kind: "circle", cx: 58, cy: 6, r: 3, fill: "accent", opacity: 0.8 },
            { kind: "circle", cx: 74, cy: 8, r: 3, fill: "accent" },
            { kind: "path", d: "M0 60 L 12 44 L 24 60 Z", fill: "ink", opacity: 0.35 },
            { kind: "path", d: "M20 60 L 40 40 L 60 60 Z", fill: "ink", opacity: 0.5 },
            { kind: "path", d: "M54 60 L 76 42 L 98 60 Z", fill: "ink", opacity: 0.35 },
        ],
    },
    // Resume — one page, well set.
    sheet: {
        viewBox: FIELD,
        shapes: [
            { kind: "rect", x: 26, y: 6, width: 48, height: 50, rx: 3, fill: "panel" },
            { kind: "rect", x: 34, y: 14, width: 20, height: 4, rx: 2, fill: "accent" },
            { kind: "rect", x: 34, y: 24, width: 32, height: 2.5, rx: 1.25, fill: "muted", opacity: 0.7 },
            { kind: "rect", x: 34, y: 31, width: 28, height: 2.5, rx: 1.25, fill: "muted", opacity: 0.55 },
            { kind: "rect", x: 34, y: 38, width: 32, height: 2.5, rx: 1.25, fill: "muted", opacity: 0.4 },
            { kind: "rect", x: 34, y: 45, width: 18, height: 2.5, rx: 1.25, fill: "accent", opacity: 0.6 },
        ],
    },
    // Store — an awning over the goods.
    awning: {
        viewBox: FIELD,
        shapes: [
            { kind: "path", d: "M8 22 Q 50 2 92 22 L 92 30 L 8 30 Z", fill: "accent", opacity: 0.85 },
            { kind: "rect", x: 20, y: 36, width: 18, height: 18, rx: 2, fill: "muted", opacity: 0.5 },
            { kind: "rect", x: 42, y: 36, width: 18, height: 18, rx: 2, fill: "accent", opacity: 0.45 },
            { kind: "rect", x: 64, y: 36, width: 18, height: 18, rx: 2, fill: "muted", opacity: 0.35 },
        ],
    },
    // Non-profit — a light kept on.
    lantern: {
        viewBox: FIELD,
        shapes: [
            { kind: "circle", cx: 50, cy: 30, r: 24, fill: "accent", opacity: 0.14 },
            { kind: "circle", cx: 50, cy: 30, r: 16, fill: "accent", opacity: 0.22 },
            { kind: "rect", x: 42, y: 18, width: 16, height: 24, rx: 4, fill: "accent" },
            { kind: "rect", x: 46, y: 10, width: 8, height: 5, rx: 2.5, fill: "muted", opacity: 0.8 },
            { kind: "rect", x: 38, y: 46, width: 24, height: 3, rx: 1.5, fill: "muted", opacity: 0.5 },
        ],
    },
    // Anything else — an empty frame, waiting.
    frame: {
        viewBox: FIELD,
        shapes: [
            { kind: "rect", x: 16, y: 8, width: 68, height: 44, rx: 3, fill: "panel" },
            { kind: "rect", x: 16, y: 8, width: 68, height: 44, rx: 3, stroke: "muted", opacity: 0.6 },
            { kind: "circle", cx: 40, cy: 26, r: 8, fill: "accent", opacity: 0.8 },
            { kind: "path", d: "M24 48 L 44 30 L 58 40 L 70 32 L 78 48 Z", fill: "accent", opacity: 0.45 },
        ],
    },
};

// Motifs are assigned by category, so a template never has to pick its own artwork and
// the library stays visually coherent as it grows through 10 / 18 / 25.
export const MOTIF_BY_CATEGORY: Record<string, MotifId> = {
    portfolio: "arcs",
    restaurant: "ember",
    saas: "chart",
    agency: "orbit",
    blog: "rules",
    event: "marquee",
    resume: "sheet",
    store: "awning",
    nonprofit: "lantern",
    other: "frame",
    // R2 library-refresh categories. Every design now ships a hero photograph, so a motif
    // is only the fallback the preview draws when an image is missing — mapped here to the
    // nearest existing shape rather than adding art no tile will normally show.
    fitness: "chart",
    food: "ember",
    photography: "frame",
    architecture: "rules",
    education: "sheet",
    travel: "arcs",
    business: "orbit",
    beauty: "arcs",
    real_estate: "frame",
    healthcare: "sheet",
    design: "rules",
    professional_services: "orbit",
    entertainment: "marquee",
    hospitality: "lantern",
    automotive: "orbit",
    media: "marquee",
    sports: "chart",
    health_wellness: "lantern",
    pets: "arcs",
    arts_culture: "frame",
    retail: "awning",
    finance: "chart",
    wellness: "lantern",
    health: "lantern",
    creative: "arcs",
};

export function toMotifId(value: string | undefined | null): MotifId {
    return value && value in MOTIFS ? (value as MotifId) : "frame";
}

type StringPalette = Record<PaletteRole, string>;

function attributes(shape: MotifShape, palette: StringPalette): string {
    const parts = [`fill="${shape.fill ? palette[shape.fill] : "none"}"`];

    if (shape.stroke) {
        parts.push(
            `stroke="${palette[shape.stroke]}"`,
            `stroke-width="${shape.strokeWidth ?? 1.5}"`,
            'stroke-linecap="round"',
            'stroke-linejoin="round"',
        );
    }
    if (shape.opacity !== undefined) parts.push(`opacity="${shape.opacity}"`);

    return parts.join(" ");
}

// The SVG that goes into the template's own index.html.
export function motifToSvg(id: MotifId, palette: StringPalette): string {
    const motif = MOTIFS[id];
    const body = motif.shapes
        .map((shape) => {
            const common = attributes(shape, palette);
            if (shape.kind === "circle") {
                return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" ${common} />`;
            }
            if (shape.kind === "rect") {
                return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx ?? 0}" ${common} />`;
            }
            return `<path d="${shape.d}" ${common} />`;
        })
        .join("\n      ");

    return `<svg class="hero-art" data-motif="${id}" viewBox="${motif.viewBox}" preserveAspectRatio="none" aria-hidden="true">
      ${body}
    </svg>`;
}
