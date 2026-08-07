import type { Template } from "@/lib/contracts";

// Restaurant one-pager (R2 · Day 2). First-party original, MIT-licensed (C-06).
export const ember: Template = {
  id: "ember",
  name: "Ember",
  description: "A warm, dark one-page site for a restaurant — menu, hours and a booking prompt.",
  category: "restaurant",
  tags: ["restaurant", "dark", "one-page", "has-menu", "has-form"],
  thumbnailUrl: "/templates/ember/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/ember",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "name", label: "Restaurant name", type: "text", maxLength: 40 },
          { key: "tagline", label: "Tagline", type: "text", maxLength: 100 },
          { key: "image", label: "Hero image", type: "image" },
        ],
      },
      {
        key: "menu",
        label: "Menu",
        fields: [
          {
            key: "items",
            label: "Dishes",
            type: "list",
            itemSchema: [
              { key: "name", label: "Dish", type: "text", maxLength: 40 },
              { key: "price", label: "Price", type: "text", maxLength: 10 },
              { key: "description", label: "Description", type: "text", maxLength: 120 },
            ],
          },
        ],
      },
      {
        key: "hours",
        label: "Opening hours",
        fields: [
          {
            key: "schedule",
            label: "Days",
            type: "list",
            itemSchema: [
              { key: "day", label: "Day", type: "text", maxLength: 20 },
              { key: "hours", label: "Hours", type: "text", maxLength: 40 },
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
    <title>Ember</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.name">Ember Kitchen</h1>
      <p data-slot="hero.tagline">Wood-fired plates, poured slow.</p>
      <a class="book" href="#hours">Book a table</a>
    </header>
    <section class="menu">
      <h2>Menu</h2>
      <ul data-slot="menu.items">
        <li><span class="dish">Charred aubergine</span><span class="price">₹320</span></li>
        <li><span class="dish">Smoked paneer</span><span class="price">₹360</span></li>
      </ul>
    </section>
    <section class="hours" id="hours">
      <h2>Hours</h2>
      <ul data-slot="hours.schedule">
        <li><span>Tue–Sun</span><span>6pm – 11pm</span></li>
        <li><span>Monday</span><span>Closed</span></li>
      </ul>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --bg: #14100e; --ink: #f6efe9; --muted: #b7a89b; --accent: #e2683b; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: var(--bg); color: var(--ink); }
.hero { padding: 6rem 1.5rem 4rem; text-align: center; }
.hero h1 { margin: 0 0 .5rem; font-size: 3rem; letter-spacing: .01em; }
.hero p { margin: 0 0 1.5rem; color: var(--muted); font-size: 1.125rem; }
.book { display: inline-block; padding: .75rem 1.5rem; border-radius: 999px; background: var(--accent); color: #fff; text-decoration: none; }
.menu, .hours { max-width: 40rem; margin: 0 auto; padding: 2rem 1.5rem; }
h2 { font-size: 1.5rem; border-bottom: 1px solid #3a2f28; padding-bottom: .5rem; }
ul { list-style: none; padding: 0; }
li { display: flex; justify-content: space-between; padding: .6rem 0; color: var(--muted); }
.dish { color: var(--ink); }
.footer { padding: 2rem 1.5rem; text-align: center; color: var(--muted); }`,
  },
};
