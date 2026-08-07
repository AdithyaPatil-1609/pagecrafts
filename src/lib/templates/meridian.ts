import type { Template } from "@/lib/contracts";

// Agency showcase (R2 · Day 2), the signature tier — bold, motion-led.
// First-party original, MIT-licensed (C-06).
export const meridian: Template = {
  id: "meridian",
  name: "Meridian",
  description: "A bold, animated agency showcase — statement hero, services and selected work.",
  category: "agency",
  tags: ["agency", "dark", "animated", "one-page", "signature"],
  thumbnailUrl: "/templates/meridian/thumbnail.png",
  tier: "signature",
  priceInr: 999,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/meridian",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "headline", label: "Statement", type: "text", maxLength: 80 },
          { key: "subhead", label: "Subheading", type: "text", maxLength: 140 },
        ],
      },
      {
        key: "services",
        label: "Services",
        fields: [
          {
            key: "items",
            label: "Service list",
            type: "list",
            itemSchema: [
              { key: "title", label: "Title", type: "text", maxLength: 40 },
              { key: "body", label: "Description", type: "richtext" },
            ],
          },
        ],
      },
      {
        key: "work",
        label: "Selected work",
        fields: [
          {
            key: "items",
            label: "Projects",
            type: "list",
            itemSchema: [
              { key: "title", label: "Project", type: "text", maxLength: 50 },
              { key: "image", label: "Image", type: "image" },
            ],
          },
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
    <title>Meridian</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.headline">We build brands that move.</h1>
      <p data-slot="hero.subhead">A studio for ambitious founders.</p>
    </header>
    <section class="services">
      <h2>Services</h2>
      <ul data-slot="services.items">
        <li><h3>Brand</h3><p>Identity, voice, system.</p></li>
        <li><h3>Web</h3><p>Sites that convert.</p></li>
        <li><h3>Motion</h3><p>Story in movement.</p></li>
      </ul>
    </section>
    <section class="work">
      <h2>Selected work</h2>
      <ul data-slot="work.items">
        <li class="tile">Northwind</li>
        <li class="tile">Cadence</li>
      </ul>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --bg: #0b0b12; --ink: #f4f4ff; --muted: #9a9ab5; --accent: #7c5cff; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; background: var(--bg); color: var(--ink); overflow-x: hidden; }
@keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.hero { padding: 8rem 1.5rem 5rem; text-align: center; animation: rise .8s ease both; }
.hero h1 { margin: 0 0 1rem; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; letter-spacing: -0.03em;
  background: linear-gradient(90deg, var(--ink), var(--accent)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero p { margin: 0; color: var(--muted); font-size: 1.25rem; }
.services, .work { max-width: 62rem; margin: 0 auto; padding: 3rem 1.5rem; }
h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .2em; color: var(--muted); }
.services ul, .work ul { list-style: none; padding: 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.services li h3 { margin: 0 0 .35rem; font-size: 1.5rem; }
.services li p { margin: 0; color: var(--muted); }
.tile { aspect-ratio: 4 / 3; display: flex; align-items: flex-end; padding: 1rem; border-radius: 1rem;
  background: linear-gradient(160deg, #1a1830, #2a2350); transition: transform .3s ease; }
.tile:hover { transform: translateY(-6px); }
.footer { padding: 3rem 1.5rem; text-align: center; color: var(--muted); }`,
  },
};
