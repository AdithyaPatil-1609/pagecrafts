import type { Template } from "@/lib/contracts";

// SaaS landing page (R2 · Day 2). First-party original, MIT-licensed (C-06).
export const ledger: Template = {
  id: "ledger",
  name: "Ledger",
  description: "A crisp light SaaS landing page — hero, feature grid and a call to action.",
  category: "saas",
  tags: ["saas", "light", "one-page", "has-form"],
  thumbnailUrl: "/templates/ledger/thumbnail.png",
  tier: "premium",
  priceInr: 499,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/ledger",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "headline", label: "Headline", type: "text", maxLength: 60 },
          { key: "subhead", label: "Subheading", type: "text", maxLength: 140 },
          { key: "ctaLabel", label: "Button label", type: "text", maxLength: 30 },
        ],
      },
      {
        key: "features",
        label: "Features",
        fields: [
          {
            key: "items",
            label: "Feature list",
            type: "list",
            itemSchema: [
              { key: "title", label: "Title", type: "text", maxLength: 40 },
              { key: "body", label: "Description", type: "richtext" },
            ],
          },
        ],
      },
      {
        key: "cta",
        label: "Call to action",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 60 },
          { key: "body", label: "Body", type: "richtext" },
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
    <title>Ledger</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.headline">Invoicing that runs itself.</h1>
      <p data-slot="hero.subhead">Send, track and get paid — without the spreadsheet.</p>
      <a class="cta" href="#start" data-slot="hero.ctaLabel">Start free</a>
    </header>
    <section class="features">
      <ul data-slot="features.items">
        <li><h3>Auto-reminders</h3><p>Nudge late payers on a schedule.</p></li>
        <li><h3>One-tap pay</h3><p>UPI and cards, built in.</p></li>
        <li><h3>Clean books</h3><p>Every invoice reconciled for you.</p></li>
      </ul>
    </section>
    <section class="cta-band" id="start">
      <h2 data-slot="cta.heading">Ready in five minutes.</h2>
      <p data-slot="cta.body">No card needed to try it.</p>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --bg: #ffffff; --ink: #0f172a; --muted: #64748b; --accent: #2563eb; --panel: #f1f5f9; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--ink); }
.hero { padding: 6rem 1.5rem 4rem; text-align: center; max-width: 48rem; margin: 0 auto; }
.hero h1 { margin: 0 0 .75rem; font-size: 2.75rem; letter-spacing: -0.02em; }
.hero p { margin: 0 0 1.5rem; color: var(--muted); font-size: 1.125rem; }
.cta { display: inline-block; padding: .75rem 1.5rem; border-radius: .5rem; background: var(--accent); color: #fff; text-decoration: none; font-weight: 600; }
.features ul { list-style: none; padding: 2rem 1.5rem; margin: 0 auto; max-width: 60rem; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.features li { background: var(--panel); border-radius: .75rem; padding: 1.5rem; }
.features h3 { margin: 0 0 .35rem; }
.features p { margin: 0; color: var(--muted); }
.cta-band { text-align: center; padding: 4rem 1.5rem; background: var(--panel); }
.footer { padding: 2rem 1.5rem; text-align: center; color: var(--muted); }`,
  },
};
