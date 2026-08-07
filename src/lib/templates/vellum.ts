import type { Template } from "@/lib/contracts";

// Resume (R2 · Day 3 sourcing block). First-party original, MIT-licensed (C-06).
export const vellum: Template = {
  id: "vellum",
  name: "Vellum",
  description: "A single-column resume page — history, skills and how to reach you.",
  category: "resume",
  tags: ["resume", "light", "one-page", "print-friendly"],
  thumbnailUrl: "/templates/vellum/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/vellum",
  contentSchema: {
    sections: [
      {
        key: "header",
        label: "Header",
        fields: [
          { key: "name", label: "Your name", type: "text", maxLength: 50 },
          { key: "role", label: "Role", type: "text", maxLength: 60 },
          { key: "email", label: "Email", type: "text", maxLength: 80 },
        ],
      },
      {
        key: "experience",
        label: "Experience",
        fields: [
          {
            key: "roles",
            label: "Roles",
            type: "list",
            itemSchema: [
              { key: "title", label: "Job title", type: "text", maxLength: 60 },
              { key: "company", label: "Company", type: "text", maxLength: 50 },
              { key: "period", label: "Period", type: "text", maxLength: 30 },
              { key: "summary", label: "What you did", type: "text", maxLength: 200 },
            ],
          },
        ],
      },
      {
        key: "skills",
        label: "Skills",
        fields: [
          {
            key: "items",
            label: "Skills",
            type: "list",
            itemSchema: [{ key: "name", label: "Skill", type: "text", maxLength: 30 }],
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
    <title>Vellum</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="header">
      <h1 data-slot="header.name">Your name</h1>
      <p class="role" data-slot="header.role">What you do, in four words</p>
      <p class="contact" data-slot="header.email">you@example.com</p>
    </header>
    <section class="experience">
      <h2>Experience</h2>
      <ul data-slot="experience.roles">
        <li>
          <div class="row"><span class="title">Senior something</span><span class="period">2023 — now</span></div>
          <p class="company">A company you have heard of</p>
          <p class="summary">One line on what you actually changed there.</p>
        </li>
      </ul>
    </section>
    <section class="skills">
      <h2>Skills</h2>
      <ul class="tags" data-slot="skills.items">
        <li>Research</li>
        <li>Writing</li>
        <li>Facilitation</li>
      </ul>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --ink: #111827; --muted: #6b7280; --paper: #ffffff; --rule: #e5e7eb; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--paper); color: var(--ink); line-height: 1.6; }
.header { max-width: 40rem; margin: 0 auto; padding: 4rem 1.5rem 1.5rem; }
.header h1 { margin: 0 0 .25rem; font-size: 2rem; letter-spacing: -.01em; }
.role { margin: 0 0 .25rem; color: var(--muted); }
.contact { margin: 0; font-size: .9375rem; color: var(--muted); }
section { max-width: 40rem; margin: 0 auto; padding: 1.5rem; }
h2 { font-size: .8125rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); border-bottom: 1px solid var(--rule); padding-bottom: .5rem; }
ul { list-style: none; padding: 0; margin: 0; }
.experience li { padding: 1rem 0; }
.row { display: flex; justify-content: space-between; gap: 1rem; }
.title { font-weight: 600; }
.period { color: var(--muted); font-size: .875rem; white-space: nowrap; }
.company { margin: .1rem 0 .35rem; color: var(--muted); font-size: .9375rem; }
.summary { margin: 0; }
.tags { display: flex; flex-wrap: wrap; gap: .5rem; padding-top: 1rem; }
.tags li { border: 1px solid var(--rule); border-radius: 999px; padding: .25rem .75rem; font-size: .875rem; color: var(--muted); }
.footer { border-top: 1px solid var(--rule); margin-top: 2rem; padding: 1.5rem; text-align: center; color: var(--muted); font-size: .875rem; }
@media print { .footer { display: none; } body { color: #000; } }`,
  },
};
