import type { Template } from "@/lib/contracts";

// Event (R2 · Day 3 sourcing block). First-party original, MIT-licensed (C-06).
export const marquee: Template = {
  id: "marquee",
  name: "Marquee",
  description: "A one-page event site — date, line-up and a place to register.",
  category: "event",
  tags: ["event", "bold", "one-page", "has-form"],
  thumbnailUrl: "/templates/marquee/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/marquee",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "name", label: "Event name", type: "text", maxLength: 50 },
          { key: "date", label: "Date", type: "text", maxLength: 40 },
          { key: "location", label: "Location", type: "text", maxLength: 60 },
          { key: "image", label: "Hero image", type: "image" },
        ],
      },
      {
        key: "schedule",
        label: "Schedule",
        fields: [
          {
            key: "slots",
            label: "Sessions",
            type: "list",
            itemSchema: [
              { key: "time", label: "Time", type: "text", maxLength: 20 },
              { key: "title", label: "Session", type: "text", maxLength: 60 },
              { key: "speaker", label: "Speaker", type: "text", maxLength: 40 },
            ],
          },
        ],
      },
      {
        key: "register",
        label: "Register",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 40 },
          { key: "body", label: "Body", type: "text", maxLength: 160 },
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
    <title>Marquee</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.name">Field Notes 2026</h1>
      <p class="meta">
        <span data-slot="hero.date">14 September</span> ·
        <span data-slot="hero.location">Bengaluru</span>
      </p>
      <a class="cta" href="#register">Register</a>
    </header>
    <section class="schedule">
      <h2>Schedule</h2>
      <ul data-slot="schedule.slots">
        <li><span class="time">10:00</span><span class="title">Opening</span><span class="who">Asha R.</span></li>
        <li><span class="time">11:30</span><span class="title">Working in the open</span><span class="who">Dev M.</span></li>
      </ul>
    </section>
    <section class="register" id="register">
      <h2 data-slot="register.heading">Come along</h2>
      <p data-slot="register.body">Seats are limited and tickets are free.</p>
      <a class="cta" href="#register" data-slot="register.ctaLabel">Save me a seat</a>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --bg: #0b1120; --ink: #f8fafc; --muted: #94a3b8; --accent: #facc15; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--ink); }
.hero { padding: 6rem 1.5rem 4rem; text-align: center; }
.hero h1 { margin: 0 0 .75rem; font-size: 3.25rem; line-height: 1.05; letter-spacing: -.02em; }
.meta { margin: 0 0 2rem; color: var(--muted); font-size: 1.0625rem; }
.cta { display: inline-block; padding: .8rem 1.75rem; border-radius: .5rem; background: var(--accent); color: #0b1120; font-weight: 600; text-decoration: none; }
.schedule, .register { max-width: 40rem; margin: 0 auto; padding: 2rem 1.5rem; }
h2 { font-size: 1.5rem; margin-bottom: 1rem; }
ul { list-style: none; padding: 0; margin: 0; }
li { display: grid; grid-template-columns: 5rem 1fr auto; gap: .75rem; padding: .85rem 0; border-top: 1px solid #1e293b; color: var(--muted); }
.time { color: var(--accent); font-variant-numeric: tabular-nums; }
.title { color: var(--ink); }
.register { text-align: center; padding-bottom: 4rem; }
.footer { border-top: 1px solid #1e293b; padding: 1.5rem; text-align: center; color: var(--muted); }`,
  },
};
