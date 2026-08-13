import { describe, expect, it } from "vitest";

import { TILE_WIDTH, TILE_WIDTH_2X, atWidth, tileSrcSet } from "@/lib/discovery/image-size";
import { TEMPLATES } from "@/lib/templates";
import { previewOf } from "@/lib/discovery/preview";

// R2 D14 — the gallery asks for pictures at the size it shows them.
//
// Each design authors its hero at ?w=1600, which is right for the page and wrong for a tile
// drawn ~320 CSS pixels wide. Measured on one of the library's own photographs: 259 KB at
// w=1600 against 42 KB at w=480. Lazy loading already spares the tiles below the fold, so
// the saving is on whatever is on screen — a dozen tiles, ~3 MB against ~500 KB.

const HERO = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=70&auto=format&fit=crop";

describe("asking for a narrower copy", () => {
    it("changes the width and nothing else", () => {
        // The crop, quality and format directives are the design's choices; resizing must
        // not quietly drop them.
        const narrowed = new URL(atWidth(HERO, 480));

        expect(narrowed.searchParams.get("w")).toBe("480");
        expect(narrowed.searchParams.get("q")).toBe("70");
        expect(narrowed.searchParams.get("fit")).toBe("crop");
        expect(narrowed.searchParams.get("auto")).toBe("format");
    });

    it("leaves a photograph from anywhere else alone", () => {
        // Guessing at another host's resizing convention produces URLs that 404 rather than
        // images that are smaller.
        const elsewhere = "https://cdn.example.com/hero.jpg?w=1600";
        expect(atWidth(elsewhere, 480)).toBe(elsewhere);
    });

    it("leaves an Unsplash URL with no width to change", () => {
        const noWidth = "https://images.unsplash.com/photo-abc";
        expect(atWidth(noWidth, 480)).toBe(noWidth);
    });

    it("leaves something that is not a URL at all", () => {
        // A hand-written relative path must not become a broken absolute one.
        expect(atWidth("/local/hero.png", 480)).toBe("/local/hero.png");
    });
});

describe("the tile's srcSet", () => {
    it("offers an ordinary and a dense screen", () => {
        const set = tileSrcSet(HERO);

        expect(set).toContain(`w=${TILE_WIDTH}`);
        expect(set).toContain(`w=${TILE_WIDTH_2X}`);
        expect(set).toMatch(/1x,.*2x$/);
    });

    it("is null when there is nothing to choose between", () => {
        // A srcSet with one entry is a longer way of writing src, and it invites the next
        // reader to think a choice is being made.
        expect(tileSrcSet("https://cdn.example.com/hero.jpg")).toBeNull();
    });
});

describe("across the real library", () => {
    it("narrows every design that ships a photograph", () => {
        // A fixture proves the fixture. These are the URLs the gallery will actually request.
        const heroes = TEMPLATES.map((t) => previewOf(t).heroImage).filter(
            (src): src is string => typeof src === "string" && src.length > 0,
        );

        expect(heroes.length).toBeGreaterThan(100);
        for (const hero of heroes) {
            expect(atWidth(hero, TILE_WIDTH), hero).toContain(`w=${TILE_WIDTH}`);
            expect(atWidth(hero, TILE_WIDTH)).not.toContain("w=1600");
        }
    });

    it("never changes which photograph is shown", () => {
        // Only the size parameter may move. If the path changed, the tile would advertise a
        // different picture from the one the design ships.
        for (const template of TEMPLATES.slice(0, 20)) {
            const hero = previewOf(template).heroImage;
            if (!hero) continue;

            expect(new URL(atWidth(hero, TILE_WIDTH)).pathname).toBe(new URL(hero).pathname);
        }
    });
});
