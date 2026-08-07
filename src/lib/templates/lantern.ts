import type { Template } from "@/lib/contracts";

// Non-profit (R2 · Day 3 sourcing block). First-party original, MIT-licensed (C-06).
export const lantern: Template = {
  id: "lantern",
  name: "Lantern",
  description: "A cause page — what you do, the numbers behind it, and a way to give.",
  category: "nonprofit",
  tags: ["nonprofit", "light", "one-page", "has-form"],
  thumbnailUrl: "/templates/lantern/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/lantern",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "name", label: "Organisation name", type: "text", maxLength: 50 },
          { key: "mission", label: "Mission", type: "text", maxLength: 160 },
          { key: "image", label: "Hero image", type: "image" },
        ],
      },
      {
        key: "impact",
        label: "Impact",
        fields: [
          {
            key: "stats",
            label: "Numbers",
            type: "list",
            itemSchema: [
              { key: "value", label: "Number", type: "text", maxLength: 12 },
              { key: "label", label: "What it counts", type: "text", maxLength: 60 },
            ],
          },
        ],
      },
      {
        key: "donate",
        label: "Donate",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 40 },
          { key: "body", label: "Body", type: "text", maxLength: 200 },
          { key: "ctaLabel", label: "Button label", type: "text", maxLength: 30 },
        ],
      },
    ],
  },
  files: {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lantern</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.name">Lantern Trust</h1>
      <p data-slot="hero.mission">We keep neighbourhood libraries open after school.</p>
      <a class="cta" href="#donate">Give once</a>
    </header>
    <section class="impact">
      <ul data-slot="impact.stats">
        <li><span class="value">14</span><span class="label">libraries kept open</span></li>
        <li><span class="value">2,300</span><span class="label">children through the door</span></li>
        <li><span class="value">96%</span><span class="label">of every rupee spent locally</span></li>
      </ul>
    </section>
    <section class="donate" id="donate">
      <h2 data-slot="donate.heading">Where your money goes</h2>
      <p data-slot="donate.body">Rs 500 keeps one library lit and staffed for an afternoon.</p>
      <a class="cta" href="#donate" data-slot="donate.ctaLabel">Give once</a>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --ink: #0f172a; --muted: #64748b; --paper: #f8fafc; --accent: #0d9488; --rule: #e2e8f0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--paper); color: var(--ink); }
.hero { padding: 6rem 1.5rem 3rem; text-align: center; max-width: 42rem; margin: 0 auto; }
.hero h1 { margin: 0 0 .75rem; font-size: 2.75rem; letter-spacing: -.02em; }
.hero p { margin: 0 0 1.75rem; font-size: 1.125rem; color: var(--muted); line-height: 1.6; }
.cta { display: inline-block; padding: .8rem 1.75rem; border-radius: .5rem; background: var(--accent); color: #fff; font-weight: 600; text-decoration: none; }
.impact { max-width: 52rem; margin: 0 auto; padding: 2rem 1.5rem; }
.impact ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.5rem; grid-template-columns: 1fr; text-align: center; }
@media (min-width: 40rem) { .impact ul { grid-template-columns: repeat(3, 1fr); } }
.impact li { border-top: 2px solid var(--accent); padding-top: 1rem; }
.value { display: block; font-size: 2.25rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.label { display: block; color: var(--muted); font-size: .9375rem; }
.donate { max-width: 40rem; margin: 0 auto; padding: 3rem 1.5rem 4rem; text-align: center; }
.donate h2 { font-size: 1.5rem; }
.donate p { color: var(--muted); margin: 0 0 1.5rem; }
.footer { border-top: 1px solid var(--rule); padding: 1.5rem; text-align: center; color: var(--muted); font-size: .875rem; }`,
  },
};
