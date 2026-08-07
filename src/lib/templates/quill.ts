import type { Template } from "@/lib/contracts";

// Blog (R2 · Day 3 sourcing block). First-party original, MIT-licensed (C-06).
export const quill: Template = {
  id: "quill",
  name: "Quill",
  description: "A quiet, readable blog — a short masthead and a list of posts.",
  category: "blog",
  tags: ["blog", "light", "editorial", "reading"],
  thumbnailUrl: "/templates/quill/thumbnail.png",
  tier: "free",
  priceInr: 0,
  license: "MIT",
  sourceUrl: "https://github.com/pagecraft/templates/tree/main/quill",
  contentSchema: {
    sections: [
      {
        key: "masthead",
        label: "Masthead",
        fields: [
          { key: "title", label: "Blog title", type: "text", maxLength: 40 },
          { key: "tagline", label: "Tagline", type: "text", maxLength: 100 },
        ],
      },
      {
        key: "posts",
        label: "Posts",
        fields: [
          {
            key: "items",
            label: "Posts",
            type: "list",
            itemSchema: [
              { key: "title", label: "Title", type: "text", maxLength: 80 },
              { key: "date", label: "Date", type: "text", maxLength: 20 },
              { key: "excerpt", label: "Excerpt", type: "text", maxLength: 200 },
            ],
          },
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
    <title>Quill</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="masthead">
      <h1 data-slot="masthead.title">Notes in the margin</h1>
      <p data-slot="masthead.tagline">Short pieces, published when they are ready.</p>
    </header>
    <main class="posts">
      <ul data-slot="posts.items">
        <li>
          <h2>On finishing things</h2>
          <time>12 March</time>
          <p>The last ten percent is where the work actually lives.</p>
        </li>
        <li>
          <h2>A smaller desk</h2>
          <time>28 February</time>
          <p>What changed when I stopped keeping everything within reach.</p>
        </li>
      </ul>
    </main>
    <section class="about">
      <h2 data-slot="about.heading">About</h2>
      <p data-slot="about.body">A sentence or two about who writes here.</p>
    </section>
    <footer class="footer"><p>Built with PageCraft.</p></footer>
  </body>
</html>`,
    "styles.css": `:root { --ink: #1c1917; --muted: #78716c; --paper: #fafaf9; --rule: #e7e5e4; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: var(--paper); color: var(--ink); line-height: 1.7; }
.masthead { max-width: 38rem; margin: 0 auto; padding: 5rem 1.5rem 2rem; border-bottom: 1px solid var(--rule); }
.masthead h1 { margin: 0 0 .5rem; font-size: 2.25rem; letter-spacing: -.01em; }
.masthead p { margin: 0; color: var(--muted); }
.posts { max-width: 38rem; margin: 0 auto; padding: 1rem 1.5rem; }
.posts ul { list-style: none; padding: 0; margin: 0; }
.posts li { padding: 2rem 0; border-bottom: 1px solid var(--rule); }
.posts h2 { margin: 0 0 .25rem; font-size: 1.375rem; }
.posts time { display: block; margin-bottom: .5rem; font-size: .875rem; color: var(--muted); }
.posts p { margin: 0; color: var(--muted); }
.about { max-width: 38rem; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
.about h2 { font-size: 1.125rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.footer { border-top: 1px solid var(--rule); padding: 1.5rem; text-align: center; color: var(--muted); font-size: .875rem; }`,
  },
};
