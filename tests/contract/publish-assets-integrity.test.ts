import { describe, expect, it } from "vitest";

import { projectPublishInputs } from "@/lib/deploy/publishable";
import { createFakeDb, type FakeDb } from "../support/fake-db";

// R3 D15 · the images on the published and republished site.
//
//   "Verify the published (and republished) site has correct content, assets with
//    attribution, and working forms end to end."
//
// Content and forms are covered by publish-build-acceptance.test.ts. Assets were not, and
// could not be: bundleAssets downloads each image from storage, the fake database had no
// storage, so every publish test ran the no-images path and the bundling added at R3 D11
// was never exercised by anything. The fake now has a bucket, so this covers it.

const HTML = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Cafe</title></head>
  <body>
    <h1 data-slot="hero.headline">Good food. Good mood.</h1>
    <div class="hero-frame" data-slot="hero.image"><img src="design.jpg" alt="A room" /></div>
    <footer><p data-credits>Photo by <a href="https://unsplash.test/@ada">Ada Lovelace</a></p></footer>
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

interface Site {
    db: FakeDb;
    id: string;
    kept: string;
    replaced: string;
}

/**
 * A project whose owner tried one photograph, replaced it with another, and published.
 *
 * Both rows stay in `assets` — nothing deletes the first, because an image may still be
 * referenced from somewhere else — so "which images ship" is a question the build has to
 * answer from content_json rather than from the table.
 */
function siteWithTwoImages(): Site {
    const db = createFakeDb({ users: [{ id: "u1" }] });

    const project = db.insert("projects", {
        user_id: "u1",
        name: "Kettle & Co.",
        content_schema: SCHEMA,
        site_meta: { title: "Kettle & Co." },
        form_endpoint: "https://forms.example/abc",
    });
    const id = project.id as string;

    const replaced = db.insert("assets", {
        project_id: id,
        storage_path: `u1/${id}/first.jpg`,
        mime_type: "image/jpeg",
    }).id as string;

    const kept = db.insert("assets", {
        project_id: id,
        storage_path: `u1/${id}/second.jpg`,
        mime_type: "image/jpeg",
    }).id as string;

    db.putObject(`u1/${id}/first.jpg`, "FIRST-PHOTO-BYTES");
    db.putObject(`u1/${id}/second.jpg`, "SECOND-PHOTO-BYTES");

    // The owner settled on the second one.
    db.rows("projects")[0]!.content_json = {
        hero: { headline: "Good food. Good mood.", image: kept },
    };

    db.insert("project_files", { project_id: id, path: "index.html", content: HTML });

    return { db, id, kept, replaced };
}

const build = (site: Site) => projectPublishInputs(site.db.asUser("u1"), site.id);
const indexOf = (files: { path: string; content: string }[]) =>
    files.find((f) => f.path === "index.html")!.content;

/**
 * The bundled images, decoded.
 *
 * Assets travel base64-encoded, so asserting on `content` directly quietly matches nothing
 * — a check written that way passes whether the image shipped or not, which is worse than
 * no check. Decode, then assert.
 */
const bundledBytes = (files: { path: string; content: string }[]): string[] =>
    files
        .filter((f) => f.path.startsWith("assets/"))
        .map((f) => Buffer.from(f.content, "base64").toString());

describe("the images that go live", () => {
    it("ships the photograph the owner chose", async () => {
        const site = siteWithTwoImages();
        const { files } = await build(site);

        const asset = files.find((f) => f.path.includes(site.kept));
        expect(asset, "the chosen image was not bundled").toBeDefined();
        expect(Buffer.from(asset!.content, "base64").toString()).toBe("SECOND-PHOTO-BYTES");
    });

    it("leaves behind the one they replaced", async () => {
        // Shipping it would put a picture the owner thought they had removed onto a public
        // site — a privacy problem, not a housekeeping one.
        const site = siteWithTwoImages();
        const { files } = await build(site);

        expect(files.some((f) => f.path.includes(site.replaced))).toBe(false);
        expect(bundledBytes(files)).not.toContain("FIRST-PHOTO-BYTES");
        expect(bundledBytes(files)).toContain("SECOND-PHOTO-BYTES");
    });

    it("points the page at the bundled copy, not at a signed URL that expires", async () => {
        const site = siteWithTwoImages();
        const html = indexOf((await build(site)).files);

        expect(html).toMatch(/src="assets\//);
        expect(html).not.toContain("token=");
        // And never the bare uuid, which would be a broken request on every page load.
        expect(html).not.toContain(`src="${site.kept}"`);
    });

    it("keeps the photographer's credit beside the image it belongs to (S-1)", async () => {
        const site = siteWithTwoImages();
        const html = indexOf((await build(site)).files);

        expect(html).toContain("Ada Lovelace");
        expect(html).toContain("https://unsplash.test/@ada");
    });
});

describe("publishing the same site again", () => {
    it("bundles the same bytes when nothing changed", async () => {
        const site = siteWithTwoImages();

        const first = await build(site);
        const second = await build(site);

        expect(second.files).toEqual(first.files);
    });

    it("swaps the image when the owner swaps it, and drops the old one", async () => {
        const site = siteWithTwoImages();
        await build(site);

        // They change their mind back.
        site.db.rows("projects")[0]!.content_json = {
            hero: { headline: "Good food. Good mood.", image: site.replaced },
        };

        const { files } = await build(site);

        expect(bundledBytes(files)).toContain("FIRST-PHOTO-BYTES");
        expect(bundledBytes(files)).not.toContain("SECOND-PHOTO-BYTES");
    });

    it("publishes the site without the image rather than failing when a file is missing", async () => {
        // The row says there is an image; the bucket disagrees. A publish that throws here
        // would block the whole site over one picture, which is the wrong trade — the page
        // is still worth having.
        const site = siteWithTwoImages();
        const orphan = site.db.insert("assets", {
            project_id: site.id,
            storage_path: `u1/${site.id}/gone.jpg`,
            mime_type: "image/jpeg",
        }).id as string;

        site.db.rows("projects")[0]!.content_json = {
            hero: { headline: "Still here", image: orphan },
        };

        const { files } = await build(site);

        expect(indexOf(files)).toContain("Still here");
        expect(files.some((f) => f.path.includes(orphan))).toBe(false);
    });
});
