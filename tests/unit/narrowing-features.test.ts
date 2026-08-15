import { describe, expect, it } from "vitest";

import { narrowingFeatures } from "@/lib/discovery/filters";
import { narrowingLibraryFeatures, parseTemplateQuery, queryTemplates } from "@/lib/templates/query";
import { TEMPLATES } from "@/lib/templates";

// A chip earns its place by dividing the library.
//
// `form`, `list` and `photo` each returned all 115 designs, because every blueprint-built
// design has a contact form, a list and a hero photograph — one single feature set across
// the whole library. Three controls that look like filters and cannot filter is worse than
// three fewer: somebody presses one, nothing moves, and they stop trusting the row.

describe("which feature chips are worth offering", () => {
    it("keeps one that separates the set", () => {
        const designs = [
            { features: ["form", "photo"] as const },
            { features: ["photo"] as const },
        ];

        expect(narrowingFeatures(designs)).toEqual(["form"]);
    });

    it("drops one that every design has", () => {
        // It would return the whole gallery, which is what "no filter" already does.
        const designs = [{ features: ["photo"] as const }, { features: ["photo"] as const }];

        expect(narrowingFeatures(designs)).toEqual([]);
    });

    it("drops one that no design has", () => {
        // It would return nothing, which is a dead end dressed as a choice.
        const designs = [{ features: ["photo"] as const }, { features: ["photo"] as const }];

        expect(narrowingFeatures(designs)).not.toContain("form");
    });
});

describe("the library as it actually stands", () => {
    it("offers no feature chips, because every design has every feature", () => {
        // The finding this change exists for. When a design ships without a form, this
        // expectation is the thing that fails — and the row comes back on its own.
        expect(narrowingLibraryFeatures()).toEqual([]);
    });

    it("and that is why: one feature set across all of them", () => {
        const all = queryTemplates(parseTemplateQuery(new URLSearchParams(""))).items;
        const sets = new Set(all.map((t) => [...t.features].sort().join("+")));

        expect(all).toHaveLength(TEMPLATES.length);
        expect([...sets]).toEqual(["form+list+photo"]);
    });

    it("still answers the feature parameter, so a saved link keeps working", () => {
        // The chips are a UI decision. The API contract is unchanged.
        const items = queryTemplates(parseTemplateQuery(new URLSearchParams("feature=form"))).items;

        expect(items.length).toBe(TEMPLATES.length);
        expect(items.every((t) => t.features.includes("form"))).toBe(true);
    });
});
