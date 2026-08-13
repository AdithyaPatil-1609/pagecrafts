import { describe, expect, it } from "vitest";

import { addItem, blankItem, moveItem, removeItem } from "@/lib/content/list-ops";
import { validateFieldValue } from "@/lib/content/apply-ops";
import type { Field } from "@/lib/contracts";
import { TEMPLATES } from "@/lib/templates";

// R2 D11 — finishing repeatable lists.
//
// The whole of the risk here is the new item. Everything else is array manipulation; a new
// item has to satisfy a schema written by somebody else, and if it does not, the person
// adds a card and is immediately told the card is invalid before typing a word into it.

const ITEM_SCHEMA: Field[] = [
    { key: "title", label: "Title", type: "text", maxLength: 40 },
    { key: "body", label: "Body", type: "richtext", maxLength: 160 },
    { key: "photo", label: "Photo", type: "image" },
    { key: "accent", label: "Accent", type: "color" },
    { key: "size", label: "Size", type: "select", options: ["small", "large"] },
];

const CARDS: Field = { key: "items", label: "Cards", type: "list", itemSchema: ITEM_SCHEMA };

describe("a new item", () => {
    it("has every field its schema names", () => {
        // applyContentOps refuses an item missing any of them, so `{}` would be rejected on
        // the first save — before the person has typed anything into the card they just added.
        expect(Object.keys(blankItem(ITEM_SCHEMA)).sort()).toEqual(
            ITEM_SCHEMA.map((f) => f.key).sort(),
        );
    });

    it("starts with values each type will actually accept", () => {
        const item = blankItem(ITEM_SCHEMA);

        expect(item.title).toBe("");
        expect(item.photo).toBeNull();
        expect(item.accent).toBe("#000000");
        expect(item.size).toBe("small");
    });

    it("is saveable the moment it is added — the property all of the above is for", () => {
        expect(validateFieldValue(CARDS, [blankItem(ITEM_SCHEMA)])).toBeNull();
    });

    it("is saveable for every list in the real library", () => {
        // A fixture proves the fixture. These are the item schemas people will actually add
        // cards to, and a blank card has to be legal in all of them.
        const lists = TEMPLATES.flatMap((t) =>
            t.contentSchema.sections.flatMap((s) => s.fields.filter((f) => f.type === "list")),
        );

        expect(lists.length).toBeGreaterThan(0);
        for (const list of lists) {
            expect(validateFieldValue(list, [blankItem(list.itemSchema ?? [])]), list.key).toBeNull();
        }
    });

    it("says so plainly when a select offers nothing to pick", () => {
        // A schema that cannot be satisfied should complain, not be papered over.
        const impossible: Field = { key: "x", label: "X", type: "select", options: [] };
        expect(blankItem([impossible]).x).toBe("");
        expect(validateFieldValue(impossible, "")).toContain("Expected one of");
    });
});

describe("adding, removing, reordering", () => {
    const a = { title: "a" };
    const b = { title: "b" };
    const c = { title: "c" };

    it("adds to the end, where the person is looking", () => {
        const next = addItem([a, b], ITEM_SCHEMA);
        expect(next).toHaveLength(3);
        expect(next[2].title).toBe("");
    });

    it("removes the one asked for and nothing else", () => {
        expect(removeItem([a, b, c], 1)).toEqual([a, c]);
    });

    it("ignores a remove that is out of range rather than truncating", () => {
        expect(removeItem([a, b], 5)).toEqual([a, b]);
        expect(removeItem([a, b], -1)).toEqual([a, b]);
    });

    it("swaps neighbours on a move", () => {
        expect(moveItem([a, b, c], 1, -1)).toEqual([b, a, c]);
        expect(moveItem([a, b, c], 1, 1)).toEqual([a, c, b]);
    });

    it("refuses to move off either end rather than clamping", () => {
        // Clamping would make the top item's "up" do nothing while still looking pressable.
        // The panel hides the button at the ends; this agrees with it.
        expect(moveItem([a, b, c], 0, -1)).toEqual([a, b, c]);
        expect(moveItem([a, b, c], 2, 1)).toEqual([a, b, c]);
    });

    it("never mutates the list it was given", () => {
        // The panel holds this array in state and re-renders from it; mutating in place
        // would change what React is diffing against and drop a render.
        const items = [a, b, c];
        const before = JSON.stringify(items);

        addItem(items, ITEM_SCHEMA);
        removeItem(items, 0);
        moveItem(items, 0, 1);

        expect(JSON.stringify(items)).toBe(before);
    });

    it("keeps the list valid across a round of edits", () => {
        let items: unknown[] = [];
        items = addItem(items, ITEM_SCHEMA);
        items = addItem(items, ITEM_SCHEMA);
        items = moveItem(items, 0, 1);
        items = removeItem(items, 0);

        expect(items).toHaveLength(1);
        expect(validateFieldValue(CARDS, items)).toBeNull();
    });
});
