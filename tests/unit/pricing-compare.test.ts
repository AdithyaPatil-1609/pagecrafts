import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lookTierPreviewHtml, COMPARE_LOOKS } from "@/lib/demos/look-tiers";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("pricing and compare marketing pages", () => {
    it("keeps template tiers distinct from AI packages on /pricing", () => {
        const page = read("src", "components", "marketing", "PricingGuide.tsx");
        expect(page).toContain("Starter / Pro / Premium");
        expect(page).toContain("Free / Advanced");
        expect(page).toContain("do not mix");
        expect(page).toContain('href="/packages"');
        expect(page).toContain('href="/compare"');
    });

    it("ships a recorded Harbour House preview for each look", () => {
        expect(COMPARE_LOOKS.map((l) => l.id)).toEqual(["starter", "pro", "premium"]);
        expect(COMPARE_LOOKS.map((l) => l.styleId)).toEqual(["casual", "photos", "motion"]);
        const starter = lookTierPreviewHtml("starter");
        const pro = lookTierPreviewHtml("pro");
        const premium = lookTierPreviewHtml("premium");
        expect(starter).toContain("site-sidebar");
        expect(starter).toContain("Harbour House");
        expect(pro).toContain("site-topbar-blend");
        expect(premium).toContain("site-liquid");
        expect(premium).toContain("liquid-deck");
        expect(premium).toContain("Reservations");
        expect(starter).not.toContain("Loom");
        expect(pro).not.toContain("cloth brand");
    });

    it("does not lock liquid previews with html scroll-snap", () => {
        const chrome = read("src", "lib", "sites", "tier-chrome-markup.ts");
        expect(chrome).not.toMatch(/html:has\(\.site-liquid\)[\s\S]*scroll-snap-type/);
        const css = read("src", "app", "globals.css");
        expect(css).toContain("scroll-snap-stop: normal");
        expect(css).not.toContain("scroll-snap-stop: always");
    });
});
