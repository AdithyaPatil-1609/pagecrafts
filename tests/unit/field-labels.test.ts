import { describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates";
import {
    fieldLabel,
    itemFieldLabel,
    itemLabel,
    sectionLabel,
} from "@/lib/editor/field-labels";
import type { ContentSection, Field } from "@/lib/contracts";

// What the content panel calls things.
//
// The panel used to read out of the stored schema and so read like the code: "Hero",
// "Headline (max 60)", "Body", "Site", "Item 1", "Add item". Somebody who has just picked a
// restaurant design and wants to change the big sentence at the top does not know it is
// called a headline, or that the section holding it is called a hero.
//
// The labels are derived rather than stored because `content_schema` is copied into a
// project at fork time — a stored label is frozen at fork, and every later wording change
// would need a migration to reach projects that already exist.

const heading: Field = { key: "heading", label: "Heading", type: "text", maxLength: 60 };
const body: Field = { key: "body", label: "Body", type: "richtext" };
const list = (label: string): Field => ({ key: "items", label, type: "list", itemSchema: [] });

const section = (key: string, label: string): ContentSection => ({ key, label, fields: [] });

describe("the words a person reads", () => {
    it("names the sections we invented a word for", () => {
        expect(sectionLabel(section("hero", "Hero"))).toBe("First Section");
        expect(sectionLabel(section("site", "Site"))).toBe("Your Website");
    });

    it("leaves a design's own section name alone", () => {
        // "Your Menu" and "Book a Table" are editorial choices in the blueprint. The panel
        // shows what the design says.
        expect(sectionLabel(section("menu", "Your Menu"))).toBe("Your Menu");
        expect(sectionLabel(section("book", "Book a Table"))).toBe("Book a Table");
    });

    it("names the hero's fields for what they are on the page", () => {
        const hero = section("hero", "Hero");
        expect(fieldLabel(hero, { key: "headline", label: "Headline", type: "text" })).toBe("Main Heading");
        expect(fieldLabel(hero, { key: "subhead", label: "Subheading", type: "text" })).toBe("Short Description");
        expect(fieldLabel(hero, { key: "cta", label: "Button label", type: "text" })).toBe("Button Text");
        expect(fieldLabel(hero, { key: "image", label: "Hero image", type: "image" })).toBe("Main Image");
    });

    it("names the site fields in the person's terms", () => {
        const site = section("site", "Your Website");
        expect(fieldLabel(site, { key: "name", label: "Site name", type: "text" })).toBe("Website Name");
        expect(fieldLabel(site, { key: "footer", label: "Footer note", type: "text" })).toBe("Bottom Text");
    });
});

describe("fields that appear in every section", () => {
    it("says which section a heading belongs to", () => {
        // Otherwise a panel with four sections has four fields called "Heading" and the only
        // way to tell them apart is to count down the page.
        expect(fieldLabel(section("menu", "Your Menu"), heading)).toBe("Menu Heading");
        expect(fieldLabel(section("rooms", "Rooms"), heading)).toBe("Rooms Heading");
    });

    it("calls the body a description, because that is what it is", () => {
        expect(fieldLabel(section("menu", "Your Menu"), body)).toBe("Menu Description");
    });

    it("takes the noun from the key, not the display name", () => {
        // The display name is written to read as a heading. Building field names out of it
        // gives "Your Menu Heading" and "Add Your Menu Item".
        expect(fieldLabel(section("menu", "Your Menu"), heading)).not.toContain("Your Menu Heading");
        expect(itemLabel(section("menu", "Your Menu"))).toBe("Menu Item");
    });

    it("uses the word a section wants rather than the one its key spells", () => {
        expect(fieldLabel(section("book", "Book a Table"), heading)).toBe("Booking Heading");
        expect(fieldLabel(section("book", "Book a Table"), body)).toBe("Booking Description");
    });
});

describe("lists, which is where the grammar goes wrong", () => {
    it("does not call a plural list a list of items", () => {
        // "Rooms Items" and "Add Rooms Item" both read as a mistake.
        expect(fieldLabel(section("rooms", "Rooms"), list("Rooms"))).toBe("Rooms");
        expect(itemLabel(section("rooms", "Rooms"))).toBe("Room");
    });

    it("adds the word Item when the section noun is singular", () => {
        expect(fieldLabel(section("menu", "Your Menu"), list("Menu"))).toBe("Menu Items");
        expect(itemLabel(section("menu", "Your Menu"))).toBe("Menu Item");
    });

    it("handles the plurals the library actually contains", () => {
        const cases: [string, string][] = [
            ["strategies", "Strategy"],
            ["properties", "Property"],
            ["classes", "Class"],
            ["services", "Service"],
            ["treatments", "Treatment"],
            ["shows", "Show"],
        ];
        for (const [key, one] of cases) {
            expect(itemLabel(section(key, key)), key).toBe(one);
        }
    });

    it("names a list item's cells without repeating the list", () => {
        expect(itemFieldLabel({ key: "title", label: "Title" })).toBe("Item Name");
        expect(itemFieldLabel({ key: "body", label: "Body" })).toBe("Item Description");
    });
});

describe("across the whole library", () => {
    it("never produces a label that reads as a mistake", () => {
        const wrong: string[] = [];

        for (const template of TEMPLATES) {
            for (const s of template.contentSchema.sections) {
                for (const field of s.fields) {
                    const label = fieldLabel(s, field);
                    // The two shapes the grammar can break into.
                    if (/s Items$/.test(label)) wrong.push(`${template.id}: "${label}"`);
                    if (label.trim() === "" ) wrong.push(`${template.id}: empty label`);
                }
                if (s.fields.some((f) => f.type === "list") && /s Item$/.test(itemLabel(s))) {
                    wrong.push(`${template.id}: "Add ${itemLabel(s)}"`);
                }
            }
        }

        expect(wrong.slice(0, 8)).toEqual([]);
    });

    it("gives every field in every design a label", () => {
        for (const template of TEMPLATES) {
            for (const s of template.contentSchema.sections) {
                expect(sectionLabel(s).trim(), `${template.id}/${s.key}`).not.toBe("");
                for (const field of s.fields) {
                    expect(fieldLabel(s, field).trim(), `${template.id}/${s.key}/${field.key}`).not.toBe("");
                }
            }
        }
    });

    it("falls back to the stored label for a field it has no opinion about", () => {
        // A design with an unusual field, or a schema written by hand, reads exactly as it
        // did before any of this existed.
        const odd = section("menu", "Your Menu");
        expect(fieldLabel(odd, { key: "opening_hours", label: "Opening hours", type: "text" }))
            .toBe("Opening hours");
        expect(fieldLabel(odd, { key: "opening_hours", label: "", type: "text" }))
            .toBe("Opening hours");
    });
});
