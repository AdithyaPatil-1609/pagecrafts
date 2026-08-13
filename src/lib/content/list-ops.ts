import type { Field } from "@/lib/contracts";

// Adding, removing and reordering the items of a list field (R2 D11).
//
// Kept out of the component on purpose. The panel is the only place these are used, and the
// panel cannot be unit-tested in this repo — vitest runs on `node` with no DOM and no
// testing-library. Logic that lives in a component here is logic nothing checks, so the
// decisions worth checking live in this file and the component calls them.
//
// Every operation returns a whole new array, because that is what the write path takes: a
// list is set entire, as one op. There is no "move item 2 up" the API could receive, and
// inventing one for the panel's convenience would put a second shape into content_json that
// the schema does not describe.

/**
 * A new item, shaped by the schema rather than empty.
 *
 * `{}` would be the obvious thing and it is wrong: applyContentOps requires every field an
 * itemSchema names to be present, so an empty object is rejected the moment it is saved —
 * and the person is told their card is invalid before they have typed anything into it.
 *
 * The starting values are the emptiest ones each type will actually accept:
 *
 *   text, richtext  ""            — empty is allowed; a blank card is a card you are filling in
 *   image           null          — the schema's own word for "no image", not a made-up id
 *   colour          #000000       — a colour field must hold a hex; "" is not one
 *   select          first option  — the options are the only legal values, and "" is not among them
 *
 * A select with no options is a schema that cannot be satisfied. It gets "" here, which the
 * validator will refuse and label — better a visible complaint about the design than a card
 * that silently cannot be saved.
 */
export function blankItem(itemSchema: Field[]): Record<string, unknown> {
    const item: Record<string, unknown> = {};

    for (const field of itemSchema) {
        switch (field.type) {
            case "image":
                item[field.key] = null;
                break;
            case "color":
                item[field.key] = "#000000";
                break;
            case "select":
                item[field.key] = field.options?.[0] ?? "";
                break;
            case "list":
                // Nested lists are refused by the write path. The key is still written so the
                // item has the shape its schema describes, and the validator says the real
                // reason rather than "missing field".
                item[field.key] = [];
                break;
            default:
                item[field.key] = "";
        }
    }

    return item;
}

/** The list with one more item at the end. */
export function addItem(items: unknown[], itemSchema: Field[]): Record<string, unknown>[] {
    return [...(items as Record<string, unknown>[]), blankItem(itemSchema)];
}

/** The list without the item at `index`. Out of range leaves it alone. */
export function removeItem(items: unknown[], index: number): unknown[] {
    if (index < 0 || index >= items.length) return items;
    return items.filter((_, i) => i !== index);
}

/**
 * The list with the item at `index` moved by `offset` (-1 up, +1 down).
 *
 * A move that would fall off either end returns the list unchanged rather than clamping.
 * Clamping would make the top item's "up" button silently do nothing while still looking
 * pressable; the panel hides the button instead, and this agrees with it.
 */
export function moveItem(items: unknown[], index: number, offset: number): unknown[] {
    const target = index + offset;
    if (index < 0 || index >= items.length) return items;
    if (target < 0 || target >= items.length) return items;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}
