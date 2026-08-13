import { describe, expect, it } from "vitest";

import { applyContentToFiles } from "@/lib/content/to-files";
import { contentFromFiles } from "@/lib/content/from-files";
import type { ContentSchema } from "@/lib/contracts";

// R2 D8 — the content panel edits content_json, and the preview has to show the result.
//
// applyContentToFiles is the half that makes an edit visible. It is the mirror of
// contentFromFiles, and the pair is what lets the panel be generated from the schema alone:
// the same data-slot attributes are read on the way in and written on the way out, so a
// design cannot be editable in the panel and unrenderable in the preview.

const SCHEMA: ContentSchema = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "headline", label: "Headline", type: "text", maxLength: 60 },
                { key: "subhead", label: "Subheading", type: "richtext" },
                { key: "image", label: "Photo", type: "image" },
            ],
        },
        {
            key: "menu",
            label: "Menu",
            fields: [
                {
                    key: "items",
                    label: "Cards",
                    type: "list",
                    itemSchema: [{ key: "title", label: "Title", type: "text" }],
                },
            ],
        },
    ],
};

const HTML = `<main>
  <h1 class="big" data-slot="hero.headline">Old headline</h1>
  <p data-slot="hero.subhead">Old subhead</p>
  <div class="hero-frame" data-slot="hero.image"><img src="https://x.test/a.jpg" alt="A room" /></div>
  <ul><li><h3 data-slot="menu.items.0.title">Old card</h3></li></ul>
</main>`;

const FILES = { "index.html": HTML, "styles.css": ".big{}" };

describe("showing an edit in the preview", () => {
    it("writes the new words into the slot", () => {
        const next = applyContentToFiles(FILES, { hero: { headline: "New headline" } }, SCHEMA);

        expect(next["index.html"]).toContain(">New headline<");
        expect(next["index.html"]).not.toContain("Old headline");
    });

    it("keeps the element, its tag and its attributes", () => {
        // The panel edits words, never structure (C-07). A replacement that dropped the
        // class would restyle the page as a side effect of retyping a heading.
        const next = applyContentToFiles(FILES, { hero: { headline: "New" } }, SCHEMA);

        expect(next["index.html"]).toContain('<h1 class="big" data-slot="hero.headline">New</h1>');
    });

    it("escapes what it writes, so copy cannot become markup", () => {
        const next = applyContentToFiles(FILES, { hero: { headline: '<script>x</script>' } }, SCHEMA);

        expect(next["index.html"]).toContain("&lt;script&gt;");
        expect(next["index.html"]).not.toContain("<script>x</script>");
    });

    it("leaves a slot alone when content has nothing to say about it", () => {
        // content_json is only ever a partial picture — images live in it as asset ids, and
        // a field nobody has touched may be absent. Blanking those slots would turn "not
        // edited yet" into an empty page.
        const next = applyContentToFiles(FILES, { hero: { headline: "New" } }, SCHEMA);

        expect(next["index.html"]).toContain("Old subhead");
        expect(next["index.html"]).toContain("Old card");
    });

    it("does not put an asset id where a photograph goes", () => {
        const next = applyContentToFiles(
            FILES,
            { hero: { image: "11111111-2222-4333-8444-555555555555" } },
            SCHEMA,
        );

        expect(next["index.html"]).toContain('<img src="https://x.test/a.jpg"');
        expect(next["index.html"]).not.toContain("11111111-2222");
    });

    it("fills a card's fields as well as the page's", () => {
        const next = applyContentToFiles(
            FILES,
            { menu: { items: [{ title: "New card" }] } },
            SCHEMA,
        );

        expect(next["index.html"]).toContain(">New card<");
    });

    it("returns the same object when there is nothing to change", () => {
        // The preview re-renders off this; handing back a new object every keystroke would
        // repaint the iframe for edits that changed nothing.
        expect(applyContentToFiles(FILES, {}, SCHEMA)).toBe(FILES);
        expect(applyContentToFiles(FILES, { hero: { headline: "Old headline" } }, SCHEMA)).toBe(FILES);
    });
});

describe("reading and writing are the same slots", () => {
    it("survives a round trip through the panel", () => {
        // The property that keeps the two halves honest: what the panel shows is what the
        // page says, and saving it back does not drift.
        const edited = { hero: { headline: "Kettle & Co.", subhead: "Open from seven." } };
        const rendered = applyContentToFiles(FILES, edited, SCHEMA);
        const readBack = contentFromFiles(rendered, SCHEMA) as Record<string, Record<string, unknown>>;

        expect(readBack.hero.headline).toBe("Kettle & Co.");
        expect(readBack.hero.subhead).toBe("Open from seven.");
    });
});
