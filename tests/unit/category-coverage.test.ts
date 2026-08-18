import { describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates";
import {
    CATEGORY_ALIASES,
    CATEGORY_CARDS,
    CATEGORY_LABELS,
    filterByCategory,
    toCategory,
} from "@/lib/discovery/categories";
import type { Category } from "@/lib/contracts";

// Category and tier coverage (R2 D17, Doc 22 P1).
//
// The intent screen is a promise: every card on it says "there is something here for you".
// A card behind which the library ships nothing breaks that promise outright, and a card
// behind which everything costs money breaks it more quietly — the person picked a shelf,
// browsed it, and found the only way forward is a payment. Doc 22 P1 says at least one free
// design per category, and until D17 nothing checked it. Two shelves were failing:
// `architecture` held one design at Rs 999 and `agency` one at Rs 499.
//
// These run over the real library rather than a fixture, so a design added or repriced
// later is measured the same way.

const designsIn = (category: Category) => TEMPLATES.filter((t) => t.category === category);

describe("every shelf a person can pick has something behind it", () => {
    it("ships at least one design for every card", () => {
        const empty = CATEGORY_CARDS.filter((c) => designsIn(c).length === 0);
        expect(empty).toEqual([]);
    });

    it("ships at least one free design for every card", () => {
        // The dead end this test exists for: a shelf that can only be left by paying.
        const paidOnly = CATEGORY_CARDS.filter((c) => {
            const designs = designsIn(c);
            return designs.length > 0 && designs.every((t) => t.tier !== "free");
        });
        expect(paidOnly).toEqual([]);
    });

    it("does not strand a design on a shelf nobody can filter to", () => {
        // The other direction, and the one that actually happened once: `store` had fourteen
        // designs while being absent from the cards, so the gallery's whole e-commerce shelf
        // was unreachable.
        //
        // Carded, not merely aliased. An alias redirects the *filter*, so a design stored
        // under `agency` would be hidden by the very redirect that makes ?category=agency
        // work — the filter resolves to `business` and matches on the stored value, which is
        // still `agency`. Invisible on every shelf. The design's own category has to be one
        // the gallery actually shows.
        const carded = new Set<string>(CATEGORY_CARDS);
        const stranded = [...new Set(TEMPLATES.map((t) => t.category))].filter((c) => !carded.has(c));
        expect(stranded).toEqual([]);
    });

    it("gives every card a label to show", () => {
        for (const c of CATEGORY_CARDS) {
            expect(CATEGORY_LABELS[c]?.trim(), c).toBeTruthy();
        }
    });
});

describe("the shelves folded at D17", () => {
    it("lands an old link on the shelf its designs moved to", () => {
        // A bookmarked ?category=retail must still filter. Resolving it to undefined would
        // silently show the whole library, which looks to the person like the filter was
        // ignored rather than redirected.
        expect(toCategory("retail")).toBe("store");
        expect(toCategory("agency")).toBe("business");
        expect(toCategory("wellness")).toBe("health_wellness");
        expect(toCategory("health")).toBe("health_wellness");
    });

    it("leaves nothing behind on a folded shelf", () => {
        for (const folded of Object.keys(CATEGORY_ALIASES) as Category[]) {
            expect(designsIn(folded), `${folded} still has designs`).toEqual([]);
        }
    });

    it("takes the folded shelves off the intent screen", () => {
        for (const folded of Object.keys(CATEGORY_ALIASES) as Category[]) {
            expect(CATEGORY_CARDS).not.toContain(folded);
        }
    });

    it("points every fold at a shelf that is itself carded", () => {
        // A fold into a shelf that was also folded, or into one with no card, would move the
        // designs somewhere the person still cannot reach.
        for (const [from, to] of Object.entries(CATEGORY_ALIASES)) {
            expect(CATEGORY_CARDS, `${from} -> ${to}`).toContain(to);
        }
    });

    it("actually shows the moved designs on the destination shelf", () => {
        // The end-to-end version: follow the old link the way the gallery does and check the
        // bookshop is in the result.
        const shelf = filterByCategory(TEMPLATES, toCategory("retail"));
        expect(shelf.map((t) => t.id)).toContain("bookstore");
        expect(shelf.map((t) => t.id)).toContain("florist");
    });
});

describe("what a person is asked to pay for", () => {
    it("keeps every paid design on a shelf that also has a free one", () => {
        for (const paid of TEMPLATES.filter((t) => t.tier !== "free")) {
            const free = designsIn(paid.category).filter((t) => t.tier === "free");
            expect(free.length, `${paid.id} is the only design on ${paid.category}`).toBeGreaterThan(0);
        }
    });

    it("prices a free design at nothing at all", () => {
        // "Rs 0" would invent a transaction. priceLine already returns null for free, and
        // this checks the data behind it rather than the formatting.
        for (const t of TEMPLATES.filter((x) => x.tier === "free")) {
            expect(t.priceInr, t.id).toBe(0);
        }
    });
});
