import type { Template } from "@/lib/contracts";

// First real template entry (R2 · Day 1). Seeds the 10 / 18 / 25 grind.
// A permissive licence and a real source URL are mandatory (C-06): no provenance, no entry.
export const aurora: Template = {
  id: "aurora",
  name: "Aurora",
  description: "A clean one-page portfolio with a bold hero and an about section.",
  category: "portfolio",
  tags: ["minimal", "light", "one-page", "portfolio"],
  thumbnailUrl: "/templates/aurora/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/aurora",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "headline", label: "Headline", type: "text", maxLength: 60 },
          { key: "subhead", label: "Subheading", type: "text", maxLength: 120 },
          { key: "image", label: "Background image", type: "image" },
        ],
      },
      {
        key: "about",
        label: "About",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 40 },
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
    <title>Aurora</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.headline">Your name, your work.</h1>
      <p data-slot="hero.subhead">A simple portfolio that puts the work first.</p>
    </header>
    <main class="about">
      <h2 data-slot="about.heading">About</h2>
      <p data-slot="about.body">Tell people who you are and what you make.</p>
    </main>
    <footer class="footer">
      <p>Built with PageCraft.</p>
    </footer>
  </body>
</html>`,
    "styles.css": `:root { --ink: #171717; --accent: #4f46e5; --paper: #ffffff; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: var(--ink); background: var(--paper); }
.hero { padding: 6rem 1.5rem 4rem; text-align: center; }
.hero h1 { margin: 0 0 0.5rem; font-size: 2.75rem; color: var(--accent); }
.hero p { margin: 0; font-size: 1.125rem; color: #6b7280; }
.about { max-width: 42rem; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
.about h2 { font-size: 1.5rem; }
.footer { border-top: 1px solid #e5e7eb; padding: 1.5rem; text-align: center; color: #6b7280; }`,
  },
};
