import { describe, expect, it } from "vitest";

import { metaTags } from "@/lib/deploy/publishable";
import { projectPublishInputs } from "@/lib/deploy/publishable";
import { applyContentToFiles } from "@/lib/content/to-files";
import { createFakeDb } from "../support/fake-db";

// R3 D15 · the social card, and the injection gaps.
//
//   "Verify on a live published site that title/description/og:image/favicon are all
//    correct (S-3, S-4); fix any injection gaps."
//
// publish-build-acceptance.test.ts covers title and description. This covers the other two
// named tags, and the clause that comes after the semicolon.
//
// Everything an owner types reaches a live page: a headline, a site title, a form endpoint.
// If any of it lands in the markup unescaped then the person who typed it can run script on
// their own published domain — and, once a site is shared, on a visitor's browser. The
// escaping exists at every layer today. This asserts it, because escaping is the kind of
// thing that survives until someone adds one more field in a hurry.

const HOSTILE = [
    ['a closing tag and a script', '</h1><script>alert(1)</script><h1>'],
    ['an attribute break-out', '" onload="alert(1)'],
    ['a closed title', '</title><script>alert(1)</script>'],
    ['an image with a handler', '"><img src=x onerror=alert(1)>'],
    ['an ampersand that could start an entity', 'Tea & Toast <b>bold</b>'],
] as const;

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cafe</title>
  </head>
  <body>
    <h1 data-slot="hero.headline">Good food. Good mood.</h1>
    <form class="form" action="" method="post"><input type="email" name="email" /></form>
  </body>
</html>`;

const SCHEMA = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [{ key: "headline", label: "Headline", type: "text" as const }],
        },
    ],
};

/**
 * Nothing a browser would execute.
 *
 * The test is the raw payload's absence, not the absence of scary substrings. Escaped text
 * legitimately contains "onerror=" — `content="&lt;img src=x onerror=alert(1)&gt;"` is a
 * string a browser renders and never runs — so grepping for that reports a vulnerability
 * where there is none. What actually matters is that the characters which would end an
 * attribute or open a tag came through as entities, and that is exactly "the payload does
 * not appear as it was typed".
 */
function expectInert(html: string, payload: string) {
    expect(html, "the payload reached the page unescaped").not.toContain(payload);
    // These designs ship no script of their own, so any at all came from user input.
    expect(html).not.toMatch(/<script/i);
}

function siteWith(overrides: Record<string, unknown>) {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const project = db.insert("projects", {
        user_id: "u1",
        name: "Kettle & Co.",
        content_schema: SCHEMA,
        content_json: { hero: { headline: "Good food. Good mood." } },
        site_meta: { title: "Kettle & Co.", description: "On the corner." },
        form_endpoint: null,
        ...overrides,
    });
    const id = project.id as string;
    db.insert("project_files", { project_id: id, path: "index.html", content: HTML });
    return { db, id };
}

const indexOf = (files: { path: string; content: string }[]) =>
    files.find((f) => f.path === "index.html")!.content;

describe("the social card (S-3, S-4)", () => {
    it("points og:image at the owner's image, resolved to a real URL", () => {
        const tags = metaTags(
            { title: "Kettle", ogImageAssetId: "asset-1" },
            { "asset-1": "assets/og.png" },
        );

        expect(tags).toContain('<meta property="og:image" content="assets/og.png" />');
    });

    it("points the favicon at the owner's icon", () => {
        const tags = metaTags(
            { faviconAssetId: "asset-2" },
            { "asset-2": "assets/icon.png" },
        );

        expect(tags).toContain('<link rel="icon" href="assets/icon.png" />');
    });

    it("writes neither when the asset never resolved, rather than emitting the raw id", () => {
        // A favicon pointing at a uuid is a broken request on every page load, and an
        // og:image pointing at one is a share card with a hole in it.
        const tags = metaTags({ faviconAssetId: "asset-3", ogImageAssetId: "asset-4" }, {}).join("");

        expect(tags).not.toContain("asset-3");
        expect(tags).not.toContain("asset-4");
    });

    it("declares og:type once there is anything worth previewing", () => {
        expect(metaTags({ title: "Kettle" })).toContain('<meta property="og:type" content="website" />');
        expect(metaTags({})).toEqual([]);
    });
});

describe("nothing the owner types can run on their published site", () => {
    it.each(HOSTILE)("a site title carrying %s", async (_label, payload) => {
        const { db, id } = siteWith({ site_meta: { title: payload, description: payload } });
        const { files } = await projectPublishInputs(db.asUser("u1"), id);

        expectInert(indexOf(files), payload);
    });

    it.each(HOSTILE)("a headline carrying %s", async (_label, payload) => {
        const { db, id } = siteWith({ content_json: { hero: { headline: payload } } });
        const { files } = await projectPublishInputs(db.asUser("u1"), id);

        expectInert(indexOf(files), payload);
    });

    it("a form endpoint cannot break out of the action attribute", async () => {
        const { db, id } = siteWith({ form_endpoint: '" onsubmit="alert(1)' });
        const { files } = await projectPublishInputs(db.asUser("u1"), id);

        expect(indexOf(files)).not.toContain('onsubmit="alert(1)"');
    });

    it("keeps the owner's real characters readable while it does so", async () => {
        // Escaping that mangles "Tea & Toast" into something else is its own bug: the
        // point is inert markup, not lost punctuation.
        const { db, id } = siteWith({ content_json: { hero: { headline: "Tea & Toast" } } });
        const { files } = await projectPublishInputs(db.asUser("u1"), id);

        expect(indexOf(files)).toContain("Tea &amp; Toast");
    });

    it("escapes at the renderer, so every caller inherits it", () => {
        const applied = applyContentToFiles(
            { "index.html": HTML },
            { hero: { headline: "<script>alert(1)</script>" } },
            SCHEMA,
        );

        expectInert(applied["index.html"]!, "<script>alert(1)</script>");
    });
});

describe("a design the head cannot be injected into", () => {
    it("still publishes, rather than silently dropping every meta tag", async () => {
        // A sourced template with no </head> is malformed but not impossible. The tags are
        // inserted before </head>; with nothing to match, a plain replace writes nothing and
        // says nothing, and the site goes live with no title and no share card.
        const headless = "<html><body><h1 data-slot=\"hero.headline\">Hi</h1></body></html>";
        const db = createFakeDb({ users: [{ id: "u1" }] });
        const project = db.insert("projects", {
            user_id: "u1",
            name: "Headless",
            content_schema: SCHEMA,
            content_json: { hero: { headline: "Hi" } },
            site_meta: { title: "Headless Cafe", description: "No head at all." },
            form_endpoint: null,
        });
        const id = project.id as string;
        db.insert("project_files", { project_id: id, path: "index.html", content: headless });

        const { files } = await projectPublishInputs(db.asUser("u1"), id);
        const html = indexOf(files);

        expect(html, "the owner's title never reached the page").toContain("Headless Cafe");
    });
});
