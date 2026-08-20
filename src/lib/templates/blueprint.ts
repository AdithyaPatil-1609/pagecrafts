import type { Category, ContentSchema, Field, Template, TemplateTier } from "@/lib/contracts";
import { MOTIF_BY_CATEGORY, motifToSvg } from "./motifs";
import { thumbnailPath } from "./thumbnails";
import type { MotifId, PaletteRole } from "./motifs";

// Templates are authored as blueprints, not as hand-written HTML. One generator emits the
// markup, the stylesheet and the content schema together, which is what keeps the promise
// of "zero per-template UI" true: every design exposes the same slot vocabulary, so the
// editor's content panel is generated from `content_schema` and never forked per template.
//
// It also keeps the gallery honest — the miniature on the tile is drawn by parsing these
// same generated files, so a card cannot advertise a layout the template does not have.

export type Layout = "split" | "full-bleed" | "centered" | "showcase";

export type Palette = Record<PaletteRole | "rule", string>;

export interface SectionSpec {
    key: string;
    label: string;
    heading: string;
    body: string;
    kind: "prose" | "cards" | "form";
    cards?: { title: string; body: string }[];
}

export interface Blueprint {
    id: string;
    name: string;
    description: string;
    category: Category;
    tags: string[];
    tier: TemplateTier;
    license: string;
    sourceUrl: string;
    palette: Palette;
    layout: Layout;
    nav: string[];
    hero: { headline: string; subhead: string; cta: string };
    // The photograph that fills the hero. Optional: a design with none falls back to the
    // code-drawn motif for its category, so the library never renders an empty frame.
    heroImage?: { src: string; alt: string };
    sections: SectionSpec[];
    footer: string;
    /** Classifier slug when it differs from `id`. */
    vertical?: string;
}

const TIER_PRICE_INR: Record<TemplateTier, number> = { free: 0, premium: 499, signature: 999 };

/** Corpus / classifier slugs that do not match the design id. */
const VERTICAL_ALIAS: Record<string, string> = {
    "ngo-nonprofit": "ngo",
    "saas-product": "saas",
    architecture: "architecture-studio",
};

const SEARCH_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function heroMarkup(bp: Blueprint, motif: MotifId): string {
    // A photograph where the design ships one; the code-drawn motif where it does not.
    // Either way it sits in the hero.image slot, so swapping it is a content edit — not a
    // template change — and the slot/schema parity the editor relies on holds.
    const art = bp.heroImage
        // Eager: the hero is above the fold (and LCP). Lazy here left Chromium with an
        // empty frame when thumbnails were rendered, which is why the gallery shipped
        // blank dark tiles for some designs.
        ? `<img class="hero-photo" src="${escapeHtml(bp.heroImage.src)}" alt="${escapeHtml(bp.heroImage.alt)}" loading="eager" decoding="async" fetchpriority="high" />`
        : motifToSvg(motif, bp.palette);

    return `    <section class="hero">
      <div class="hero-copy">
        <h1 data-slot="hero.headline">${escapeHtml(bp.hero.headline)}</h1>
        <p data-slot="hero.subhead">${escapeHtml(bp.hero.subhead)}</p>
        <a class="cta" href="#${slug(bp.sections[0]?.heading ?? "more")}" data-slot="hero.cta">${escapeHtml(bp.hero.cta)}</a>
      </div>
      <div class="hero-frame" data-slot="hero.image">
        ${art}
      </div>
    </section>`;
}

function sectionMarkup(section: SectionSpec): string {
    const heading = `<h2 data-slot="${section.key}.heading">${escapeHtml(section.heading)}</h2>`;
    const body = `<p data-slot="${section.key}.body">${escapeHtml(section.body)}</p>`;

    if (section.kind === "cards") {
        const cards = (section.cards ?? [])
            .map(
                (card, index) => `        <li class="card">
          <h3 data-slot="${section.key}.items.${index}.title">${escapeHtml(card.title)}</h3>
          <p data-slot="${section.key}.items.${index}.body">${escapeHtml(card.body)}</p>
        </li>`,
            )
            .join("\n");

        return `    <section class="section" id="${slug(section.heading)}">
      ${heading}
      ${body}
      <ul class="cards">
${cards}
      </ul>
    </section>`;
    }

    if (section.kind === "form") {
        // action is left empty on purpose: publishing fills in the form endpoint the
        // owner chose, and a template must never ship a third-party destination.
        return `    <section class="section" id="${slug(section.heading)}">
      ${heading}
      ${body}
      <form class="form" action="" method="post">
        <input type="email" name="email" placeholder="you@example.com" aria-label="Email" required />
        <button type="submit">${escapeHtml(section.label)}</button>
      </form>
    </section>`;
    }

    return `    <section class="section" id="${slug(section.heading)}">
      ${heading}
      ${body}
    </section>`;
}

function indexHtml(bp: Blueprint, motif: MotifId): string {
    const nav = bp.nav
        .map((label) => `        <a href="#${slug(label)}">${escapeHtml(label)}</a>`)
        .join("\n");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(bp.name)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-layout="${bp.layout}">
    <header class="topbar">
      <span class="wordmark" data-slot="site.name">${escapeHtml(bp.name)}</span>
      <nav class="nav">
${nav}
      </nav>
      <span class="search" role="img" aria-label="Search">${SEARCH_ICON}</span>
    </header>
${heroMarkup(bp, motif)}
${bp.sections.map(sectionMarkup).join("\n")}
    <footer class="footer">
      <p data-slot="site.footer">${escapeHtml(bp.footer)}</p>
    </footer>
  </body>
</html>`;
}

// Per-layout hero rules. Everything else in the stylesheet is shared, so the library
// stays coherent as it grows and a fix lands everywhere at once.
const LAYOUT_CSS: Record<Layout, string> = {
    split: `.hero { display: grid; gap: 3rem; grid-template-columns: 1.05fr 0.95fr; align-items: center; padding: 4.5rem 2rem 3.5rem; }
.hero-frame { aspect-ratio: 4 / 3; }`,
    "full-bleed": `.hero { position: relative; isolation: isolate; padding: 7rem 2rem 6rem; }
.hero-copy { position: relative; max-width: 34rem; }
.hero-frame { position: absolute; inset: 0; z-index: -1; border-radius: 0; }
.hero-frame::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, var(--bg) 12%, transparent 85%); }`,
    centered: `.hero { padding: 5rem 2rem 0; text-align: center; }
.hero-copy { max-width: 40rem; margin: 0 auto; }
.hero p { margin-inline: auto; }
.hero-frame { margin: 3rem auto 0; max-width: 64rem; aspect-ratio: 16 / 6; }`,
    showcase: `.hero { display: grid; gap: 3rem; grid-template-columns: 0.95fr 1.05fr; align-items: center; padding: 4.5rem 2rem 3.5rem; }
.hero-copy { order: 2; }
.hero-frame { order: 1; aspect-ratio: 1 / 1; }`,
};

function stylesCss(bp: Blueprint): string {
    const p = bp.palette;

    return `:root {
  --bg: ${p.bg};
  --ink: ${p.ink};
  --muted: ${p.muted};
  --accent: ${p.accent};
  --panel: ${p.panel};
  --rule: ${p.rule};
}
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
}
a { color: inherit; }

.topbar { display: flex; align-items: center; gap: 2rem; padding: 1.25rem 2rem; }
.wordmark { font-weight: 700; letter-spacing: -0.01em; }
.nav { margin-left: auto; display: flex; gap: 1.5rem; }
.nav a { color: var(--muted); font-size: 0.875rem; text-decoration: none; }
.nav a:hover { color: var(--ink); }
.search { display: inline-flex; color: var(--muted); }
.search svg { width: 1.125rem; height: 1.125rem; }

.hero h1 { margin: 0; font-size: clamp(2.25rem, 5vw, 3.5rem); line-height: 1.05; letter-spacing: -0.025em; }
.hero p { margin: 1rem 0 0; max-width: 34rem; color: var(--muted); font-size: 1.0625rem; }
.cta {
  display: inline-block;
  margin-top: 1.75rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
}
.cta:hover { filter: brightness(1.08); }
.hero-frame { overflow: hidden; border-radius: 1rem; background: var(--panel); }
.hero-art { display: block; width: 100%; height: 100%; }
.hero-photo { display: block; width: 100%; height: 100%; object-fit: cover; }
${LAYOUT_CSS[bp.layout]}

.section { max-width: 64rem; margin: 0 auto; padding: 4rem 2rem; }
.section h2 { margin: 0 0 0.75rem; font-size: 1.625rem; letter-spacing: -0.015em; }
.section p { margin: 0; max-width: 42rem; color: var(--muted); }

.cards { display: grid; gap: 1.25rem; grid-template-columns: repeat(3, 1fr); margin: 2rem 0 0; padding: 0; list-style: none; }
.card { padding: 1.5rem; border-radius: 0.75rem; background: var(--panel); border: 1px solid var(--rule); }
.card h3 { margin: 0 0 0.5rem; font-size: 1rem; }
.card p { color: var(--muted); font-size: 0.9375rem; }

.form { display: flex; gap: 0.75rem; margin-top: 1.75rem; flex-wrap: wrap; }
.form input {
  flex: 1 1 16rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--rule);
  border-radius: 0.5rem;
  background: var(--panel);
  color: var(--ink);
  font: inherit;
}
.form button {
  padding: 0.75rem 1.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--accent);
  color: var(--bg);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.footer { border-top: 1px solid var(--rule); margin-top: 2rem; padding: 2rem; text-align: center; color: var(--muted); font-size: 0.875rem; }

@media (max-width: 48rem) {
  .hero { grid-template-columns: 1fr; padding-top: 2.5rem; }
  .hero-copy { order: 0; }
  .hero-frame { order: 1; }
  .nav { display: none; }
  .cards { grid-template-columns: 1fr; }
}`;
}

function contentSchema(bp: Blueprint): ContentSchema {
    const sections = bp.sections.map((section) => {
        const fields: Field[] = [
            { key: "heading", label: "Heading", type: "text", maxLength: 60 },
            { key: "body", label: "Body", type: "richtext" },
        ];

        if (section.kind === "cards") {
            fields.push({
                key: "items",
                label: section.label,
                type: "list",
                itemSchema: [
                    { key: "title", label: "Title", type: "text", maxLength: 40 },
                    { key: "body", label: "Body", type: "text", maxLength: 160 },
                ],
            });
        }

        return { key: section.key, label: section.label, fields };
    });

    return {
        sections: [
            {
                key: "hero",
                label: "Hero",
                fields: [
                    { key: "headline", label: "Headline", type: "text", maxLength: 60 },
                    { key: "subhead", label: "Subheading", type: "text", maxLength: 140 },
                    { key: "cta", label: "Button label", type: "text", maxLength: 24 },
                    { key: "image", label: "Hero image", type: "image" },
                ],
            },
            ...sections,
            {
                key: "site",
                label: "Site",
                fields: [
                    { key: "name", label: "Site name", type: "text", maxLength: 40 },
                    { key: "footer", label: "Footer note", type: "text", maxLength: 120 },
                ],
            },
        ],
    };
}

export function buildTemplate(bp: Blueprint): Template {
    const motif = MOTIF_BY_CATEGORY[bp.category] ?? "frame";

    return {
        id: bp.id,
        name: bp.name,
        description: bp.description,
        category: bp.category,
        vertical: bp.vertical ?? VERTICAL_ALIAS[bp.id] ?? bp.id,
        tags: bp.tags,
        // The path the renderer actually writes to (R2 D18). This said
        // `/templates/<id>/thumbnail.png` for as long as the field has existed and no such
        // file was ever produced, so the record advertised a 404 to anybody who read it
        // directly. thumbnailPath() is the one place that spelling lives now, shared with
        // the renderer, so the two cannot drift apart again.
        thumbnailUrl: thumbnailPath(bp.id),
        tier: bp.tier,
        priceInr: TIER_PRICE_INR[bp.tier],
        license: bp.license,
        sourceUrl: bp.sourceUrl,
        contentSchema: contentSchema(bp),
        files: {
            "index.html": indexHtml(bp, motif),
            "styles.css": stylesCss(bp),
        },
    };
}
