import { describe, expect, it } from "vitest";

import { applyAssetsToHtml, assetPath, referencedAssetIds } from "@/lib/deploy/publish-assets";
import type { ContentSchema } from "@/lib/contracts";

// R3 D11 — the owner's own images, in the published build.
//
// Before this, a photograph chosen in the panel lived in content_json as a uuid and never
// reached the live page: to-files.ts skips image slots ("resolved at publish"), and publish
// did not resolve them. Bundling the assets into the deployment fixes that and dissolves the
// signed-URL problem at the same time — a file inside the build is a relative path.

const SCHEMA: ContentSchema = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "headline", label: "Headline", type: "text" },
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
                    itemSchema: [
                        { key: "title", label: "Title", type: "text" },
                        { key: "photo", label: "Photo", type: "image" },
                    ],
                },
            ],
        },
    ],
};

const A = "11111111-2222-4333-8444-555555555555";
const B = "99999999-8888-4777-8666-555555555555";

const HTML = `<main>
  <h1 data-slot="hero.headline">Hi</h1>
  <div class="hero-frame" data-slot="hero.image"><img class="hero-photo" src="https://images.example/design.jpg" alt="A room" /></div>
  <ul><li><div data-slot="menu.items.0.photo"><img src="https://images.example/card.jpg" alt="Card" /></div></li></ul>
</main>`;

describe("which assets a site actually needs", () => {
    it("finds the ones its content names", () => {
        const ids = referencedAssetIds({ hero: { image: A } }, SCHEMA, {});
        expect(ids).toEqual([A]);
    });

    it("looks inside list items too", () => {
        const ids = referencedAssetIds({ menu: { items: [{ photo: B }] } }, SCHEMA, {});
        expect(ids).toEqual([B]);
    });

    it("includes the favicon and the social image", () => {
        const ids = referencedAssetIds({}, SCHEMA, { faviconAssetId: A, ogImageAssetId: B });
        expect(ids.sort()).toEqual([A, B].sort());
    });

    it("names each one once, however many places use it", () => {
        const ids = referencedAssetIds({ hero: { image: A } }, SCHEMA, { faviconAssetId: A });
        expect(ids).toEqual([A]);
    });

    it("leaves out images the site does not show", () => {
        // A project collects pictures somebody tried and replaced. Shipping those would put
        // images the owner thought they had removed onto a public site.
        expect(referencedAssetIds({}, SCHEMA, {})).toEqual([]);
    });
});

describe("where an asset lands in the build", () => {
    it("is a relative path, so no domain or signature is baked in", () => {
        expect(assetPath(A, "image/png")).toBe(`assets/${A}.png`);
        expect(assetPath(A, "image/jpeg")).toBe(`assets/${A}.jpg`);
        expect(assetPath(A, "image/svg+xml")).toBe(`assets/${A}.svg`);
    });
});

describe("pointing the page at the bundled image", () => {
    const paths = { [A]: `assets/${A}.png`, [B]: `assets/${B}.jpg` };

    it("swaps the src for the one that shipped", () => {
        const out = applyAssetsToHtml(HTML, { hero: { image: A } }, SCHEMA, paths);

        expect(out).toContain(`src="assets/${A}.png"`);
        expect(out).not.toContain("images.example/design.jpg");
    });

    it("keeps the class and the alt text — publishing does not restyle", () => {
        const out = applyAssetsToHtml(HTML, { hero: { image: A } }, SCHEMA, paths);

        expect(out).toContain('class="hero-photo"');
        expect(out).toContain('alt="A room"');
        expect(out).toContain('class="hero-frame"');
    });

    it("reaches an image inside a list item", () => {
        const out = applyAssetsToHtml(HTML, { menu: { items: [{ photo: B }] } }, SCHEMA, paths);

        expect(out).toContain(`src="assets/${B}.jpg"`);
        expect(out).not.toContain("images.example/card.jpg");
    });

    it("leaves the design's own picture where nothing was chosen", () => {
        // Somebody picked the design partly for its photographs. An untouched slot keeping
        // them is the right answer, not a gap.
        const out = applyAssetsToHtml(HTML, {}, SCHEMA, paths);

        expect(out).toBe(HTML);
    });

    it("leaves the markup alone when the asset did not make it into the build", () => {
        // bundleAssets skips a download it cannot do rather than failing the publish, so a
        // referenced-but-missing asset has no path — and a broken src is worse than the
        // design's own photo.
        const out = applyAssetsToHtml(HTML, { hero: { image: A } }, SCHEMA, {});

        expect(out).toBe(HTML);
    });

    it("does not touch a text slot that happens to sit nearby", () => {
        const out = applyAssetsToHtml(HTML, { hero: { image: A, headline: "Hi" } }, SCHEMA, paths);

        expect(out).toContain('<h1 data-slot="hero.headline">Hi</h1>');
    });
});
