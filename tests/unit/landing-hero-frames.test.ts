import { describe, expect, it } from "vitest";
import { parseTemplateQuery, queryTemplates } from "@/lib/templates/query";
import {
    HOME_LIBRARY_FACE,
    LANDING_HERO_FRAMES,
    LANDING_SHOWCASE_FRAMES,
    pickLandingHeroTemplates,
    pickLandingShowcaseTemplates,
} from "@/lib/templates/hero-frames";

describe("landing hero frames", () => {
    it("picks five library designs that are not on the signed-in home face", () => {
        const items = queryTemplates(parseTemplateQuery(new URLSearchParams())).items;
        const home = new Set(items.slice(0, HOME_LIBRARY_FACE).map((item) => item.id));
        const picked = pickLandingHeroTemplates(items);

        expect(items.length).toBeGreaterThanOrEqual(HOME_LIBRARY_FACE + LANDING_HERO_FRAMES);
        expect(picked).toHaveLength(LANDING_HERO_FRAMES);
        expect(new Set(picked.map((item) => item.id)).size).toBe(LANDING_HERO_FRAMES);
        for (const template of picked) {
            expect(home.has(template.id)).toBe(false);
        }
        expect(pickLandingHeroTemplates(items).map((item) => item.id)).toEqual(
            picked.map((item) => item.id),
        );
    });
});

describe("landing showcase frames", () => {
    it("picks four priced library designs that are not on home or in the hero", () => {
        const items = queryTemplates(parseTemplateQuery(new URLSearchParams())).items;
        const home = new Set(items.slice(0, HOME_LIBRARY_FACE).map((item) => item.id));
        const hero = new Set(pickLandingHeroTemplates(items).map((item) => item.id));
        const picked = pickLandingShowcaseTemplates(items);
        const tiers = new Set(items.map((item) => item.tier));

        expect(picked).toHaveLength(LANDING_SHOWCASE_FRAMES);
        expect(new Set(picked.map((item) => item.id)).size).toBe(LANDING_SHOWCASE_FRAMES);
        for (const template of picked) {
            expect(home.has(template.id)).toBe(false);
            expect(hero.has(template.id)).toBe(false);
        }
        for (const tier of tiers) {
            expect(picked.some((item) => item.tier === tier)).toBe(true);
        }
        expect(pickLandingShowcaseTemplates(items).map((item) => item.id)).toEqual(
            picked.map((item) => item.id),
        );
    });
});
