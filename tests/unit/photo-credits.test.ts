import { describe, expect, it } from "vitest";

import { addPhotoCredit, readCredits, toCredit } from "@/lib/content/credits";
import { TEMPLATES } from "@/lib/templates";

const page = TEMPLATES[0].files["index.html"];

describe("turning an asset's attribution into a credit", () => {
    it("prefers the photographer's name", () => {
        expect(toCredit({ name: "Ada Lovelace", username: "ada", link: "https://u/ada" })).toEqual({
            name: "Ada Lovelace",
            link: "https://u/ada",
        });
    });

    it("falls back to the username when there is no name", () => {
        expect(toCredit({ username: "ada" })).toEqual({ name: "ada", link: undefined });
    });

    it("is nothing at all for an upload, which has nobody to credit", () => {
        expect(toCredit({})).toBeNull();
    });
});

describe("writing the credit into the footer (S-1)", () => {
    it("adds a line naming the photographer", () => {
        const out = addPhotoCredit(page, { name: "Ada Lovelace", link: "https://u/ada" });

        expect(out).toContain("Ada Lovelace");
        expect(out).toContain("data-credits");
        expect(out).toContain("unsplash.com");
    });

    it("keeps earlier credits when a second photo is picked", () => {
        const one = addPhotoCredit(page, { name: "Ada", link: "https://u/ada" });
        const two = addPhotoCredit(one, { name: "Grace", link: "https://u/grace" });

        expect(readCredits(two).map((c) => c.name)).toEqual(["Ada", "Grace"]);
        expect(two.match(/data-credits/g)).toHaveLength(1);
    });

    it("does not name the same photographer twice", () => {
        const one = addPhotoCredit(page, { name: "Ada", link: "https://u/ada" });
        const again = addPhotoCredit(one, { name: "ada", link: "https://u/ada" });

        expect(readCredits(again)).toHaveLength(1);
    });

    it("escapes the name, because it comes from someone else's server", () => {
        const out = addPhotoCredit(page, { name: '<img src=x onerror="alert(1)">' });

        // Escaped, so the browser reads it as a photographer with an odd name rather than
        // as a tag: no new element, no attribute, nothing to fire.
        expect(out).not.toContain("<img src=x");
        expect(out).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    });

    it("invents no footer for a design that has none", () => {
        const noFooter = "<html><body><h1>Hi</h1></body></html>";
        expect(addPhotoCredit(noFooter, { name: "Ada" })).toBe(noFooter);
    });

    it("leaves the page alone when there is nobody to credit", () => {
        expect(addPhotoCredit(page, null)).toBe(page);
    });
});
