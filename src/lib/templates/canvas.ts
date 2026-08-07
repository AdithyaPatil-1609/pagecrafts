import type { Template } from "@/lib/contracts";

// Deliberately general (R2 · Day 3 sourcing block). First-party original, MIT-licensed (C-06).
//
// This is the entry for `category: "other"` — the landing spot for anyone whose description
// does not fit the nine named categories. Without it that filter renders an empty grid.
export const canvas: Template = {
  id: "canvas",
  name: "Canvas",
  description: "A plain, flexible page for anything that is not quite like the rest.",
  category: "other",
  tags: ["flexible", "light", "one-page", "starter"],
  thumbnailUrl: "/templates/canvas/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/canvas",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "headline", label: "Headline", type: "text", maxLength: 60 },
          { key: "subhead", label: "Subheading", type: "text", maxLength: 140 },
          { key: "image", label: "Image", type: "image" },
        ],
      },
      {
        key: "body",
        label: "Main text",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 50 },
          { key: "content", label: "Body", type: "richtext" },
        ],
      },
      {
        key: "contact",
        label: "Contact",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 40 },
          { key: "email", label: "Email", type: "text", maxLength: 80 },
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
    <title>Canvas</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.headline">Say the thing</h1>
      <p data-slot="hero.subhead">One clear sentence about what this page is for.</p>
    </header>
    <main class="body">
      <h2 data-slot="body.heading">The detail</h2>
      <p data-slot="body.content">Everything else goes here — as long or as short as you like.</p>
    </main>
    <section class="contact">
      <h2 data-slot="contact.heading">Get in touch</h2>
      <p data-slot="contact.email">hello@example.com</p>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --ink: #18181b; --muted: #71717a; --paper: #ffffff; --rule: #e4e4e7; --accent: #3f3f46; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--paper); color: var(--ink); line-height: 1.65; }
.hero { max-width: 42rem; margin: 0 auto; padding: 6rem 1.5rem 2rem; }
.hero h1 { margin: 0 0 .5rem; font-size: 2.75rem; letter-spacing: -.02em; }
.hero p { margin: 0; font-size: 1.125rem; color: var(--muted); }
.body { max-width: 42rem; margin: 0 auto; padding: 2rem 1.5rem; }
.body h2 { font-size: 1.375rem; }
.contact { max-width: 42rem; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
.contact h2 { font-size: .8125rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.contact p { margin: 0; color: var(--accent); }
.footer { border-top: 1px solid var(--rule); padding: 1.5rem; text-align: center; color: var(--muted); font-size: .875rem; }`,
  },
};
