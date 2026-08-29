import { describe, expect, it } from "vitest";

import { applySlotValue, boundSlotPaths, readContentFromHtml } from "@/lib/content/slots";
import type { ContentSchema } from "@/lib/contracts";

// The backdrop slot (a "backgroundImage" field). It is the one content type that changes an
// attribute rather than the words between the tags, so what is worth pinning down is that it
// writes to the custom property the design named and leaves everything else alone.

const schema: ContentSchema = {
    sections: [
        {
            key: "hero",
            label: "Hero",
            fields: [
                { key: "heading", label: "Heading", type: "text" },
                { key: "background", label: "Background photo", type: "backgroundImage" },
            ],
        },
    ],
};

const PAGE = [
    '<section data-slot="hero.background" data-slot-var="--section-bg"',
    ' style="--i:0; --section-bg: none">',
    '<h1 data-slot="hero.heading">Stronger every day.</h1>',
    "</section>",
].join("");

const PHOTO = "https://images.example.com/lifting.jpg";

describe("setting a background photo", () => {
    it("writes the URL into the custom property the design named", () => {
        const out = applySlotValue(PAGE, schema, "hero.background", PHOTO);

        expect(out).toContain(`--section-bg: url(${PHOTO})`);
        expect(out).not.toContain("--section-bg: none");
    });

    it("leaves the words in the section untouched", () => {
        const out = applySlotValue(PAGE, schema, "hero.background", PHOTO);

        expect(out).toContain('<h1 data-slot="hero.heading">Stronger every day.</h1>');
    });

    it("keeps the other custom properties on the same tag", () => {
        const out = applySlotValue(PAGE, schema, "hero.background", PHOTO);

        expect(out).toContain("--i:0");
    });

    it("clears to none rather than dropping the declaration", () => {
        const set = applySlotValue(PAGE, schema, "hero.background", PHOTO);
        const cleared = applySlotValue(set, schema, "hero.background", null);

        expect(cleared).toContain("--section-bg: none");
        expect(cleared).not.toContain(PHOTO);
    });

    it("reads back the photo it wrote, and null when there is none", () => {
        const set = applySlotValue(PAGE, schema, "hero.background", PHOTO);

        expect(readContentFromHtml(set, schema).hero.background).toBe(PHOTO);
        expect(readContentFromHtml(PAGE, schema).hero.background).toBeNull();
    });

    it("never writes the URL as text, which would print it across the section", () => {
        // A design that offers no custom property has nowhere to put a backdrop. Falling
        // through to the text writer would replace the whole section with a URL.
        const noVar = '<section data-slot="hero.background"><h1 data-slot="hero.heading">Hi</h1></section>';

        expect(applySlotValue(noVar, schema, "hero.background", PHOTO)).toBe(noVar);
    });

    it("is offered only where the design has somewhere to put it", () => {
        const noVar = '<section><h1 data-slot="hero.heading">Hi</h1></section>';

        expect(boundSlotPaths(PAGE, schema).has("hero.background")).toBe(true);
        expect(boundSlotPaths(noVar, schema).has("hero.background")).toBe(false);
    });
});

describe("URLs that could break the CSS or the attribute", () => {
    it("percent-encodes what would end the url() or the declaration", () => {
        const nasty = "https://images.example.com/a b(1);x.jpg";
        const out = applySlotValue(PAGE, schema, "hero.background", nasty);

        // Nothing that could close the url(), split the style attribute or start a second
        // background layer survives literally.
        const encoded = "https://images.example.com/a%20b%281%29%3Bx.jpg";
        const value = out.match(/--section-bg:\s*([^;"]+)/)![1];
        expect(value).toBe(`url(${encoded})`);
    });

    it("still round-trips such a URL back out of the page", () => {
        const nasty = "https://images.example.com/a b(1);x.jpg";
        const out = applySlotValue(PAGE, schema, "hero.background", nasty);

        expect(readContentFromHtml(out, schema).hero.background)
            .toBe("https://images.example.com/a%20b%281%29%3Bx.jpg");
    });

    it("leaves an already-encoded URL alone rather than encoding it twice", () => {
        const encoded = "https://images.example.com/a%20b.jpg";
        const out = applySlotValue(PAGE, schema, "hero.background", encoded);

        expect(out).toContain(`url(${encoded})`);
    });
});
