import { describe, expect, it } from "vitest";

import { metaTags, publishableFiles } from "@/lib/deploy/publishable";

// R3 D9 — what actually goes live.
//
// The working tree is what the owner edits and not quite what should be published: a design
// ships its own name as the <title>, and blueprint.ts leaves <form action=""> empty on
// purpose so no template can carry a third-party destination. Both are filled in here.

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cafe</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <form class="form" action="" method="post">
      <input type="email" name="email" />
    </form>
  </body>
</html>`;

const FILES = { "index.html": HTML, "styles.css": ".a{}" };

describe("the tags a published page carries", () => {
    it("uses the owner's title, not the design's", () => {
        const out = publishableFiles({
            files: FILES,
            siteMeta: { title: "Kettle & Co." },
            formEndpoint: null,
        });

        expect(out["index.html"]).toContain("<title>Kettle &amp; Co.</title>");
        expect(out["index.html"]).not.toContain("<title>Cafe</title>");
    });

    it("says nothing rather than saying nothing badly", () => {
        // An empty description tells a search engine the page has one and that it is blank.
        expect(metaTags({})).toEqual([]);
        expect(metaTags({ description: "   " })).toEqual([]);
    });

    it("escapes what it puts in an attribute", () => {
        const tags = metaTags({ title: 'He said "hi"', description: "a < b" });

        expect(tags.join(" ")).toContain("&quot;hi&quot;");
        expect(tags.join(" ")).toContain("a &lt; b");
    });

    it("skips an image whose asset id has not been resolved to a URL", () => {
        // A favicon pointing at a uuid is a broken request on every page load.
        const tags = metaTags({ title: "X", faviconAssetId: "asset-1", ogImageAssetId: "asset-2" });

        expect(tags.join(" ")).not.toContain("asset-1");
        expect(tags.join(" ")).not.toContain("asset-2");
    });

    it("uses the URL when the caller has resolved one", () => {
        const tags = metaTags(
            { title: "X", faviconAssetId: "asset-1" },
            { "asset-1": "https://cdn.example/f.png" },
        );

        expect(tags.join(" ")).toContain('<link rel="icon" href="https://cdn.example/f.png" />');
    });

    it("keeps charset and viewport ahead of what it adds", () => {
        const out = publishableFiles({
            files: FILES,
            siteMeta: { title: "Kettle" },
            formEndpoint: null,
        });
        const html = out["index.html"];

        expect(html.indexOf('charset="utf-8"')).toBeLessThan(html.indexOf("og:title"));
    });
});

describe("where a contact form posts", () => {
    it("points at the endpoint the owner chose", () => {
        const out = publishableFiles({
            files: FILES,
            siteMeta: {},
            formEndpoint: "https://forms.example/abc",
        });

        expect(out["index.html"]).toContain('action="https://forms.example/abc"');
    });

    it("is visibly disabled when there is no endpoint", () => {
        // action="" posts to the page itself, which on a static host is a reload that
        // silently loses the message. Honest beats broken.
        const out = publishableFiles({ files: FILES, siteMeta: {}, formEndpoint: null });

        expect(out["index.html"]).toContain('data-form-disabled="true"');
        expect(out["index.html"]).toContain('aria-disabled="true"');
    });

    it("leaves a form the design already aimed somewhere", () => {
        const aimed = {
            "index.html": '<form action="https://author.example/x" method="post"></form>',
        };

        const out = publishableFiles({
            files: aimed,
            siteMeta: {},
            formEndpoint: "https://forms.example/abc",
        });

        expect(out["index.html"]).toContain("https://author.example/x");
        expect(out["index.html"]).not.toContain("forms.example");
    });
});

describe("what publishing does not touch", () => {
    it("passes every other file across unchanged", () => {
        const out = publishableFiles({
            files: FILES,
            siteMeta: { title: "X" },
            formEndpoint: null,
        });

        expect(out["styles.css"]).toBe(FILES["styles.css"]);
    });

    it("does not mutate the project's own tree", () => {
        const before = FILES["index.html"];
        publishableFiles({ files: FILES, siteMeta: { title: "X" }, formEndpoint: "https://f.example/x" });

        expect(FILES["index.html"]).toBe(before);
    });

    it("hands back the same object when there is nothing to add", () => {
        const plain = { "index.html": "<html><head></head><body></body></html>" };
        expect(publishableFiles({ files: plain, siteMeta: {}, formEndpoint: null })).toBe(plain);
    });
});
