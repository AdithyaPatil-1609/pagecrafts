import { describe, expect, it } from "vitest";

import { projectPublishInputs } from "@/lib/deploy/publishable";
import { createFakeDb } from "../support/fake-db";

// R2 D15 · what actually goes live.
//
//   "Verify on a live published site that title/description/og:image/favicon are all
//    correct (S-3, S-4)... the published (and republished) site has correct content, assets
//    with attribution, and working forms end to end."
//
// The milestone says "on a live site". There is no live site — no publish route, no
// hosting, and a database four migrations behind — so this asserts the same properties one
// step earlier, on the build that would be uploaded. That covers every part of the claim
// except "the host served the bytes we gave it", and it keeps covering them afterwards,
// which a one-off look at a URL never does.

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cafe</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1 data-slot="hero.headline">Good food. Good mood.</h1>
    <div class="hero-frame" data-slot="hero.image"><img src="https://images.example/design.jpg" alt="A room" /></div>
    <form class="form" action="" method="post"><input type="email" name="email" /></form>
    <footer>
      <p data-credits>Photo by <a href="https://unsplash.test/@ada">Ada Lovelace</a></p>
    </footer>
  </body>
</html>`;

const SCHEMA = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "headline", label: "Headline", type: "text" as const },
                { key: "image", label: "Photo", type: "image" as const },
            ],
        },
    ],
};

function publishedSite(overrides: Record<string, unknown> = {}) {
    const db = createFakeDb({ users: [{ id: "u1" }] });
    const project = db.insert("projects", {
        user_id: "u1",
        name: "Kettle & Co.",
        content_schema: SCHEMA,
        content_json: { hero: { headline: "Good food. Good mood." } },
        site_meta: {
            title: "Kettle & Co. — coffee & bread",
            description: "Open from seven, on the corner.",
        },
        form_endpoint: "https://forms.example/abc",
        ...overrides,
    });
    const id = project.id as string;

    db.insert("project_files", { project_id: id, path: "index.html", content: HTML });
    db.insert("project_files", { project_id: id, path: "styles.css", content: ".a{}" });

    return { db, id };
}

const indexOf = (files: { path: string; content: string }[]) =>
    files.find((f) => f.path === "index.html")!.content;

describe("the head a visitor's browser and a link preview will read (S-3, S-4)", () => {
    it("carries the owner's title, not the design's", async () => {
        const { db, id } = publishedSite();
        const { files } = await projectPublishInputs(db.asUser("u1"), id);

        expect(indexOf(files)).toContain("<title>Kettle &amp; Co. — coffee &amp; bread</title>");
        expect(indexOf(files)).not.toContain("<title>Cafe</title>");
    });

    it("carries the description twice — for search, and for the share card", async () => {
        const { db, id } = publishedSite();
        const html = indexOf((await projectPublishInputs(db.asUser("u1"), id)).files);

        expect(html).toContain('<meta name="description" content="Open from seven, on the corner." />');
        expect(html).toContain('<meta property="og:description"');
    });

    it("says nothing at all rather than saying it blankly", async () => {
        // An empty description tells a search engine the page has one and that it is empty.
        const { db, id } = publishedSite({ site_meta: {} });
        const html = indexOf((await projectPublishInputs(db.asUser("u1"), id)).files);

        expect(html).not.toContain('name="description"');
        expect(html).not.toContain("og:image");
    });
});

describe("the content on the page", () => {
    it("is what the owner last saved, not what the design shipped", async () => {
        const { db, id } = publishedSite();
        db.rows("projects")[0]!.content_json = { hero: { headline: "New this week" } };

        expect(indexOf((await projectPublishInputs(db.asUser("u1"), id)).files)).toContain("New this week");
    });

    it("keeps the photographer's credit (S-1, and a licence condition)", async () => {
        const { db, id } = publishedSite();
        const html = indexOf((await projectPublishInputs(db.asUser("u1"), id)).files);

        expect(html).toContain("Ada Lovelace");
        expect(html).toContain("https://unsplash.test/@ada");
    });

    it("ships every other file byte for byte", async () => {
        const { db, id } = publishedSite();
        const { files } = await projectPublishInputs(db.asUser("u1"), id);

        expect(files.find((f) => f.path === "styles.css")!.content).toBe(".a{}");
    });
});

describe("the contact form (S-2)", () => {
    it("posts to the endpoint the owner configured", async () => {
        const { db, id } = publishedSite();

        expect(indexOf((await projectPublishInputs(db.asUser("u1"), id)).files))
            .toContain('action="https://forms.example/abc"');
    });

    it("is visibly disabled when no endpoint is set, rather than posting to itself", async () => {
        // action="" reloads the page on a static host and loses the message silently.
        const { db, id } = publishedSite({ form_endpoint: null });
        const html = indexOf((await projectPublishInputs(db.asUser("u1"), id)).files);

        expect(html).toContain('data-form-disabled="true"');
        expect(html).toContain('aria-disabled="true"');
    });
});

describe("publishing the same site again", () => {
    it("reflects edits made since the last publish", async () => {
        // The republish half of the milestone: an update, not a fresh site.
        const { db, id } = publishedSite();
        const first = await projectPublishInputs(db.asUser("u1"), id);

        db.rows("projects")[0]!.content_json = { hero: { headline: "Closed Mondays" } };
        const second = await projectPublishInputs(db.asUser("u1"), id);

        expect(indexOf(first.files)).not.toContain("Closed Mondays");
        expect(indexOf(second.files)).toContain("Closed Mondays");
    });

    it("produces an identical build when nothing changed", async () => {
        // Which is what lets the idempotency key mean anything: the same site assembled
        // twice must not look like two different deployments.
        const { db, id } = publishedSite();

        const first = await projectPublishInputs(db.asUser("u1"), id);
        const second = await projectPublishInputs(db.asUser("u1"), id);

        expect(second.files).toEqual(first.files);
    });

    it("will not assemble somebody else's site", async () => {
        const { db, id } = publishedSite();
        db.insert("users", { id: "u2" });

        await expect(projectPublishInputs(db.asUser("u2"), id)).rejects.toMatchObject({
            code: "not_found",
        });
    });
});
