import { describe, expect, it } from "vitest";

import {
    applyFormEndpointToHtml,
    applySettingsToHtml,
    applySiteMetaToHtml,
    hasContactForm,
} from "@/lib/content/site-meta";
import { TEMPLATES } from "@/lib/templates";

const withForm = TEMPLATES.find((t) => /<form\b/i.test(t.files["index.html"]))!;
const page = withForm.files["index.html"];

describe("site metadata in the head", () => {
    it("rewrites the title rather than adding a second one", () => {
        const out = applySiteMetaToHtml(page, {
            meta: { title: "Kettle & Co." },
            formEndpoint: null,
        });

        expect(out.match(/<title>/g)).toHaveLength(1);
        expect(out).toContain("<title>Kettle &amp; Co.</title>");
    });

    it("adds a description and the sharing tags that go with it", () => {
        const out = applySiteMetaToHtml(page, {
            meta: { title: "Kettle", description: "Coffee worth walking for." },
            formEndpoint: null,
        });

        expect(out).toContain('<meta name="description" content="Coffee worth walking for." />');
        expect(out).toContain('<meta property="og:title" content="Kettle" />');
        expect(out).toContain('<meta property="og:description" content="Coffee worth walking for." />');
    });

    it("emits no tag at all for a field left blank", () => {
        const out = applySiteMetaToHtml(page, { meta: { title: "Kettle" }, formEndpoint: null });

        expect(out).not.toContain('name="description"');
        expect(out).not.toContain('property="og:image"');
        expect(out).not.toContain('rel="icon"');
    });

    it("removes a description that has been cleared", () => {
        const withDescription = applySiteMetaToHtml(page, {
            meta: { description: "Old words" },
            formEndpoint: null,
        });
        const cleared = applySiteMetaToHtml(withDescription, { meta: {}, formEndpoint: null });

        expect(withDescription).toContain("Old words");
        expect(cleared).not.toContain("Old words");
    });

    it("points the icon and the sharing image at the chosen files", () => {
        const out = applySiteMetaToHtml(page, {
            meta: { title: "Kettle" },
            faviconUrl: "https://cdn.example.com/icon.png",
            ogImageUrl: "https://cdn.example.com/card.png",
            formEndpoint: null,
        });

        expect(out).toContain('<link rel="icon" href="https://cdn.example.com/icon.png" />');
        expect(out).toContain('<meta property="og:image" content="https://cdn.example.com/card.png" />');
    });

    it("escapes what it writes", () => {
        const out = applySiteMetaToHtml(page, {
            meta: { title: '"><script>alert(1)</script>' },
            formEndpoint: null,
        });

        expect(out).not.toContain("<script>alert(1)</script>");
    });
});

describe("the contact form endpoint (S-2)", () => {
    it("a template ships no destination of its own", () => {
        expect(hasContactForm(page)).toBe(true);
        expect(page).toContain('action=""');
    });

    it("fills in the address the owner chose", () => {
        const out = applyFormEndpointToHtml(page, "https://formspree.io/f/abc");

        expect(out).toContain('action="https://formspree.io/f/abc"');
        expect(out).not.toMatch(/<button[^>]*\sdisabled/i);
    });

    it("switches the form off when there is no address", () => {
        const live = applyFormEndpointToHtml(page, "https://formspree.io/f/abc");
        const off = applyFormEndpointToHtml(live, null);

        expect(off).toContain('action=""');
        expect(off).toMatch(/<input[^>]*\sdisabled/i);
        expect(off).toMatch(/<button[^>]*\sdisabled/i);
    });

    it("switching it back on re-enables the fields", () => {
        const off = applyFormEndpointToHtml(page, null);
        const on = applyFormEndpointToHtml(off, "https://formspree.io/f/abc");

        expect(on).not.toMatch(/<input[^>]*\sdisabled/i);
        expect(on).not.toMatch(/<button[^>]*\sdisabled/i);
    });

    it("leaves a design with no form untouched", () => {
        const plain = TEMPLATES.find((t) => !/<form\b/i.test(t.files["index.html"]));
        if (!plain) return;

        expect(hasContactForm(plain.files["index.html"])).toBe(false);
        expect(applyFormEndpointToHtml(plain.files["index.html"], "https://x.example/f")).toBe(
            plain.files["index.html"],
        );
    });
});

describe("applying both halves at once", () => {
    it("is the two functions, in either reading order", () => {
        const settings = {
            meta: { title: "Kettle", description: "Coffee." },
            formEndpoint: "https://formspree.io/f/abc",
        };

        expect(applySettingsToHtml(page, settings)).toBe(
            applyFormEndpointToHtml(applySiteMetaToHtml(page, settings), settings.formEndpoint),
        );
    });
});
