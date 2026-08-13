import { describe, expect, it } from "vitest";

import {
    applyContentToHtml,
    applySlotValue,
    boundSlotPaths,
    emptyListItem,
    fieldAt,
    mergeContent,
    readContentFromHtml,
} from "@/lib/content/slots";
import { TEMPLATES } from "@/lib/templates";
import type { ContentSchema, Field } from "@/lib/contracts";

// The content panel is only as real as this module: it is what turns a value in the panel
// into a change on the page. So the fixtures are a real design out of the library rather
// than hand-written markup — if the generator changes shape, these fail, which is the point.

const design = TEMPLATES.find((t) => t.contentSchema.sections.some((s) =>
    s.fields.some((f) => f.type === "list"),
))!;

const html = design.files["index.html"];
const schema = design.contentSchema;

function listField(): { path: string; field: Field } {
    for (const section of schema.sections) {
        for (const field of section.fields) {
            if (field.type === "list") return { path: `${section.key}.${field.key}`, field };
        }
    }
    throw new Error("the chosen design has no list field");
}

describe("reading a page back", () => {
    it("finds the words a person would recognise, not the markup around them", () => {
        const content = readContentFromHtml(html, schema);

        const inMarkup = html.match(/data-slot="hero\.headline"[^>]*>([^<]*)</)![1];

        expect(content.hero.headline).toBe(inMarkup);
        expect(String(content.hero.headline)).not.toContain("<");
        expect(String(content.hero.headline).length).toBeGreaterThan(0);
    });

    it("reads a repeatable list as items, in the order the page shows them", () => {
        const { path, field } = listField();
        const [sectionKey, fieldKey] = path.split(".");
        const items = readContentFromHtml(html, schema)[sectionKey][fieldKey] as Record<
            string,
            unknown
        >[];

        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThan(1);

        const firstKey = field.itemSchema![0].key;
        expect(String(items[0][firstKey]).length).toBeGreaterThan(0);
    });

    it("returns an empty value for a field the markup does not render", () => {
        const sparse: ContentSchema = {
            sections: [
                { key: "hero", label: "Hero", fields: [{ key: "nope", label: "Nope", type: "text", maxLength: 10 }] },
            ],
        };
        expect(readContentFromHtml(html, sparse).hero.nope).toBe("");
    });
});

describe("writing one value", () => {
    it("changes the slot and nothing else", () => {
        const next = applySlotValue(html, schema, "hero.headline", "A brand new headline");

        expect(next).toContain("A brand new headline");
        expect(readContentFromHtml(next, schema).hero.headline).toBe("A brand new headline");
        expect(next.length).not.toBe(0);
        expect(readContentFromHtml(next, schema).hero.subhead).toEqual(
            readContentFromHtml(html, schema).hero.subhead,
        );
    });

    it("escapes what it writes, so typed markup stays text", () => {
        const next = applySlotValue(html, schema, "hero.headline", '<script>alert("x")</script>');

        expect(next).not.toContain("<script>");
        expect(next).toContain("&lt;script&gt;");
        expect(readContentFromHtml(next, schema).hero.headline).toBe('<script>alert("x")</script>');
    });

    it("leaves the page alone when the slot is not on it", () => {
        expect(applySlotValue(html, schema, "hero.nothing_like_this", "x")).toBe(html);
    });

    it("swaps a photograph without losing the design's own classes", () => {
        const next = applySlotValue(html, schema, "hero.image", "https://example.com/new.jpg");

        expect(next).toContain('src="https://example.com/new.jpg"');
        expect(readContentFromHtml(next, schema).hero.image).toBe("https://example.com/new.jpg");
        expect(next).toContain("hero-photo");
    });
});

describe("a repeatable list", () => {
    const { path, field } = listField();
    const [sectionKey, fieldKey] = path.split(".");

    function itemsOf(page: string): Record<string, unknown>[] {
        return readContentFromHtml(page, schema)[sectionKey][fieldKey] as Record<string, unknown>[];
    }

    it("adds an item at the end", () => {
        const before = itemsOf(html);
        const added = emptyListItem(field);
        added[field.itemSchema![0].key] = "Brand new";

        const next = applySlotValue(html, schema, path, [...before, added]);
        const after = itemsOf(next);

        expect(after).toHaveLength(before.length + 1);
        expect(after.at(-1)![field.itemSchema![0].key]).toBe("Brand new");
    });

    it("removes an item and renumbers the ones that remain", () => {
        const before = itemsOf(html);
        const next = applySlotValue(html, schema, path, before.slice(1));
        const after = itemsOf(next);

        expect(after).toHaveLength(before.length - 1);
        expect(after[0]).toEqual(before[1]);
        expect(next).not.toContain(`data-slot="${path}.${before.length - 1}.`);
    });

    it("reorders without changing what the items say", () => {
        const before = itemsOf(html);
        const swapped = [before[1], before[0], ...before.slice(2)];

        const after = itemsOf(applySlotValue(html, schema, path, swapped));

        expect(after[0]).toEqual(before[1]);
        expect(after[1]).toEqual(before[0]);
        expect(after).toHaveLength(before.length);
    });

    it("survives being emptied and filled again", () => {
        const before = itemsOf(html);

        const emptied = applySlotValue(html, schema, path, []);
        expect(itemsOf(emptied)).toEqual([]);

        const refilled = applySlotValue(emptied, schema, path, [before[0]]);
        expect(itemsOf(refilled)).toEqual([before[0]]);
    });
});

describe("merging stored content over the page", () => {
    it("prefers what was saved and keeps the template's words for the rest", () => {
        const fromHtml = readContentFromHtml(html, schema);
        const merged = mergeContent(fromHtml, { hero: { headline: "Saved headline" } });

        expect(merged.hero.headline).toBe("Saved headline");
        expect(merged.hero.subhead).toBe(fromHtml.hero.subhead);
    });

    it("ignores a stored field the schema no longer has", () => {
        const fromHtml = readContentFromHtml(html, schema);
        const merged = mergeContent(fromHtml, { hero: { retired_field: "x" } });

        expect(merged.hero.retired_field).toBeUndefined();
    });
});

describe("applying a whole content map", () => {
    it("round-trips: read the page, write it back, and nothing has moved", () => {
        const content = readContentFromHtml(html, schema);
        const rewritten = applyContentToHtml(html, schema, content);

        expect(readContentFromHtml(rewritten, schema)).toEqual(content);
    });
});

describe("fieldAt", () => {
    it("names the field a dotted path points at", () => {
        expect(fieldAt(schema, "hero.headline")?.type).toBe("text");
        expect(fieldAt(schema, "hero.image")?.type).toBe("image");
        expect(fieldAt(schema, "hero.nope")).toBeUndefined();
        expect(fieldAt(schema, "nope.nope")).toBeUndefined();
    });
});

describe("a colour slot", () => {
    // Colours are not words on the page, so a colour slot names the custom property it
    // drives and the engine sets that instead of writing a hex code into the markup.
    const themed: ContentSchema = {
        sections: [
            {
                key: "theme",
                label: "Theme",
                fields: [{ key: "accent", label: "Accent", type: "color" }],
            },
        ],
    };

    const page =
        '<html><body data-slot="theme.accent" data-slot-var="--accent" style="--accent: #e07a3f; margin: 0">' +
        "<h1>Hi</h1></body></html>";

    it("reads the colour out of the custom property", () => {
        expect(readContentFromHtml(page, themed).theme.accent).toBe("#e07a3f");
    });

    it("sets the property and leaves the rest of the style alone", () => {
        const next = applySlotValue(page, themed, "theme.accent", "#2563eb");

        expect(next).toContain("--accent: #2563eb");
        expect(next).toContain("margin: 0");
        expect(next).not.toContain("#e07a3f");
        expect(readContentFromHtml(next, themed).theme.accent).toBe("#2563eb");
    });

    it("does not write the hex into the page as text", () => {
        const next = applySlotValue(page, themed, "theme.accent", "#2563eb");
        expect(next).toContain("<h1>Hi</h1>");
    });

    it("adds a style attribute to a slot that has none", () => {
        const bare = '<html><body data-slot="theme.accent" data-slot-var="--accent"><h1>Hi</h1></body></html>';
        const next = applySlotValue(bare, themed, "theme.accent", "#2563eb");

        expect(next).toContain('style="--accent: #2563eb"');
        expect(readContentFromHtml(next, themed).theme.accent).toBe("#2563eb");
    });

    it("falls back to text for a colour slot that names no property", () => {
        const plain = '<html><body><span data-slot="theme.accent">#e07a3f</span></body></html>';

        expect(readContentFromHtml(plain, themed).theme.accent).toBe("#e07a3f");
        expect(applySlotValue(plain, themed, "theme.accent", "#2563eb")).toContain(">#2563eb<");
    });
});

describe("the library keeps schema and markup in step", () => {
    // C-07 in one assertion: the panel is generated from content_schema, so a design whose
    // markup lacks a slot for a field it advertises renders a control that edits nothing.
    // Checked across every design rather than the one this file otherwise uses.
    it("every field a design advertises has somewhere to land", () => {
        const orphans: string[] = [];

        for (const template of TEMPLATES) {
            const page = template.files["index.html"] ?? "";
            const content = readContentFromHtml(page, template.contentSchema);

            for (const section of template.contentSchema.sections) {
                for (const field of section.fields) {
                    const value = content[section.key]?.[field.key];
                    const missing =
                        field.type === "list"
                            ? !Array.isArray(value) || value.length === 0
                            : value === "" || value === null;

                    if (missing) orphans.push(`${template.id}: ${section.key}.${field.key}`);
                }
            }
        }

        expect(orphans).toEqual([]);
    });
});

describe("knowing which fields a page can show", () => {
    it("names every field the markup has a home for", () => {
        const bound = boundSlotPaths(html, schema);
        const { path } = listField();

        expect(bound.has("hero.headline")).toBe(true);
        expect(bound.has("hero.image")).toBe(true);
        expect(bound.has(path)).toBe(true);
    });

    it("leaves out a field the design does not render", () => {
        const sparse: ContentSchema = {
            sections: [
                {
                    key: "hero",
                    label: "Hero",
                    fields: [
                        { key: "headline", label: "Headline", type: "text", maxLength: 60 },
                        { key: "nowhere", label: "Nowhere", type: "text", maxLength: 60 },
                    ],
                },
            ],
        };

        const bound = boundSlotPaths(html, sparse);
        expect(bound.has("hero.headline")).toBe(true);
        expect(bound.has("hero.nowhere")).toBe(false);
    });

    it("leaves out a list whose container is not on the page", () => {
        const bare = '<html><body><h1 data-slot="hero.headline">Hi</h1></body></html>';
        const withList: ContentSchema = {
            sections: [
                {
                    key: "menu",
                    label: "Menu",
                    fields: [
                        {
                            key: "items",
                            label: "Items",
                            type: "list",
                            itemSchema: [{ key: "name", label: "Name", type: "text", maxLength: 40 }],
                        },
                    ],
                },
            ],
        };

        expect(boundSlotPaths(bare, withList).has("menu.items")).toBe(false);
    });
});
