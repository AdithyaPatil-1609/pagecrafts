import type { Template } from "@/lib/contracts";

// Store (R2 · Day 3 sourcing block). First-party original, MIT-licensed (C-06).
export const stall: Template = {
  id: "stall",
  name: "Stall",
  description: "A small shop front — a handful of products, each with a price and a photo.",
  category: "store",
  tags: ["store", "light", "grid", "products"],
  thumbnailUrl: "/templates/stall/thumbnail.png",
  tier: "premium",
  priceInr: 499,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/stall",
  contentSchema: {
    sections: [
      {
        key: "hero",
        label: "Hero",
        fields: [
          { key: "name", label: "Shop name", type: "text", maxLength: 40 },
          { key: "tagline", label: "Tagline", type: "text", maxLength: 100 },
          { key: "image", label: "Hero image", type: "image" },
        ],
      },
      {
        key: "products",
        label: "Products",
        fields: [
          {
            key: "items",
            label: "Products",
            type: "list",
            itemSchema: [
              { key: "name", label: "Product", type: "text", maxLength: 50 },
              { key: "price", label: "Price", type: "text", maxLength: 12 },
              { key: "description", label: "Description", type: "text", maxLength: 120 },
              { key: "image", label: "Photo", type: "image" },
            ],
          },
        ],
      },
      {
        key: "contact",
        label: "Contact",
        fields: [
          { key: "heading", label: "Heading", type: "text", maxLength: 40 },
          { key: "body", label: "How to order", type: "text", maxLength: 200 },
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
    <title>Stall</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1 data-slot="hero.name">The Corner Stall</h1>
      <p data-slot="hero.tagline">Made in small batches, sold while they last.</p>
    </header>
    <main class="products">
      <ul data-slot="products.items">
        <li class="card">
          <div class="shot"></div>
          <div class="row"><span class="name">Seville marmalade</span><span class="price">₹340</span></div>
          <p class="desc">Thick cut, set loose, three ingredients.</p>
        </li>
        <li class="card">
          <div class="shot"></div>
          <div class="row"><span class="name">Beeswax wraps</span><span class="price">₹520</span></div>
          <p class="desc">A set of three, in the sizes people actually use.</p>
        </li>
      </ul>
    </main>
    <section class="contact">
      <h2 data-slot="contact.heading">To order</h2>
      <p data-slot="contact.body">Send a message and we will hold one back for you.</p>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --ink: #1f2937; --muted: #6b7280; --paper: #fffdf8; --rule: #ece7dd; --accent: #b45309; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--paper); color: var(--ink); }
.hero { padding: 5rem 1.5rem 2.5rem; text-align: center; }
.hero h1 { margin: 0 0 .5rem; font-size: 2.5rem; letter-spacing: -.01em; }
.hero p { margin: 0; color: var(--muted); }
.products { max-width: 56rem; margin: 0 auto; padding: 1rem 1.5rem; }
.products ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
@media (min-width: 40rem) { .products ul { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 60rem) { .products ul { grid-template-columns: repeat(3, 1fr); } }
.card { border: 1px solid var(--rule); border-radius: .75rem; overflow: hidden; background: #fff; }
.shot { aspect-ratio: 4 / 3; background: linear-gradient(135deg, #f4ece0, #e7dccb); }
.row { display: flex; justify-content: space-between; gap: .75rem; padding: .9rem 1rem .2rem; }
.name { font-weight: 600; }
.price { color: var(--accent); white-space: nowrap; }
.desc { margin: 0; padding: 0 1rem 1rem; color: var(--muted); font-size: .9375rem; }
.contact { max-width: 40rem; margin: 0 auto; padding: 3rem 1.5rem; text-align: center; }
.contact h2 { font-size: 1.25rem; }
.contact p { color: var(--muted); margin: 0; }
.footer { border-top: 1px solid var(--rule); padding: 1.5rem; text-align: center; color: var(--muted); font-size: .875rem; }`,
  },
};
