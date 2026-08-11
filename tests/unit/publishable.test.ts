import { describe, expect, it } from "vitest";

import { metaTags, projectPublishInputs, publishableFiles } from "@/lib/deploy/publishable";
import { createFakeDb } from "../support/fake-db";

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

// The handover to the publish route: one call, and it needs to know nothing about
// site_meta, form_endpoint or where either is kept.
describe("a project, ready to publish", () => {
    function siteReadyToGoLive() {
        const db = createFakeDb({ users: [{ id: "u1" }] });
        const project = db.insert("projects", {
            user_id: "u1",
            name: "Kettle & Co.",
            content_json: {},
            site_meta: { title: "Kettle & Co. — coffee", description: "Open from seven." },
            form_endpoint: "https://forms.example/abc",
        });
        const id = project.id as string;

        db.insert("project_files", { project_id: id, path: "index.html", content: HTML });
        db.insert("project_files", { project_id: id, path: "styles.css", content: ".a{}" });

        return { db, id };
    }

    it("returns the prepared tree in the shape publish() takes", async () => {
        const { db, id } = siteReadyToGoLive();

        const { projectName, files } = await projectPublishInputs(db.asUser("u1"), id);

        expect(projectName).toBe("Kettle & Co.");
        expect(files.map((f) => f.path)).toEqual(["index.html", "styles.css"]);
        expect(files.every((f) => f.encoding === "utf-8")).toBe(true);
    });

    it("has already applied the owner's settings", async () => {
        const { db, id } = siteReadyToGoLive();

        const { files } = await projectPublishInputs(db.asUser("u1"), id);
        const html = files.find((f) => f.path === "index.html")!.content;

        expect(html).toContain("<title>Kettle &amp; Co. — coffee</title>");
        expect(html).toContain('action="https://forms.example/abc"');
    });

    it("is in a stable order, so an unchanged site publishes identically twice", async () => {
        // The idempotency key means nothing if the same site produces a different input
        // each time it is prepared.
        const { db, id } = siteReadyToGoLive();

        const first = await projectPublishInputs(db.asUser("u1"), id);
        const second = await projectPublishInputs(db.asUser("u1"), id);

        expect(second.files).toEqual(first.files);
    });

    it("will not prepare somebody else's site", async () => {
        const { db, id } = siteReadyToGoLive();
        db.insert("users", { id: "u2" });

        await expect(projectPublishInputs(db.asUser("u2"), id)).rejects.toMatchObject({
            code: "not_found",
        });
    });
});
