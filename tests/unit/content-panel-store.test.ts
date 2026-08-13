import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@/lib/editor-store";
import { readContentFromHtml } from "@/lib/content/slots";
import { TEMPLATES } from "@/lib/templates";
import type { Field } from "@/lib/contracts";

// The content panel's half of the loop, without a server: an edit is held in state, judged
// against the schema, and written into the page the preview renders. What reaches
// content_json is the routes' business and is covered by their own tests.

const design = TEMPLATES.find((t) =>
    t.contentSchema.sections.some((s) => s.fields.some((f) => f.type === "list")),
)!;

const schema = design.contentSchema;

function listPath(): { path: string; field: Field } {
    for (const section of schema.sections) {
        for (const field of section.fields) {
            if (field.type === "list") return { path: `${section.key}.${field.key}`, field };
        }
    }
    throw new Error("no list field in the chosen design");
}

function page(): string {
    return useEditorStore.getState().vfs.read("index.html") ?? "";
}

function items(): Record<string, unknown>[] {
    const { path } = listPath();
    const [sectionKey, fieldKey] = path.split(".");
    return readContentFromHtml(page(), schema)[sectionKey][fieldKey] as Record<string, unknown>[];
}

beforeEach(() => {
    const { vfs } = useEditorStore.getState();
    vfs.reset();
    vfs.seed({ ...design.files });

    useEditorStore.setState({
        // No projectId: nothing is queued for the server, so these tests stay offline.
        projectId: null,
        activeFile: "index.html",
        contentSchema: schema,
        content: readContentFromHtml(design.files["index.html"], schema),
        contentIssues: {},
    });
});

describe("editing a field", () => {
    it("shows in the page immediately, so the preview redraws", () => {
        useEditorStore.getState().setContentValue("hero.headline", "Open at seven");

        expect(useEditorStore.getState().content.hero.headline).toBe("Open at seven");
        expect(page()).toContain("Open at seven");
    });

    it("marks the page unsaved, so autosave has something to do", () => {
        useEditorStore.getState().setContentValue("hero.headline", "Open at seven");

        expect(useEditorStore.getState().vfs.dirtyPaths()).toContain("index.html");
    });

    it("refuses a value the write path would refuse, and says why", () => {
        const field = schema.sections[0].fields.find((f) => f.type === "text" && f.maxLength)!;
        const path = `${schema.sections[0].key}.${field.key}`;
        const before = page();

        useEditorStore.getState().setContentValue(path, "x".repeat((field.maxLength ?? 0) + 1));

        const state = useEditorStore.getState();
        expect(state.contentIssues[path]).toContain("Too long");
        expect(page()).toBe(before);
    });

    it("keeps the refused text on screen rather than throwing it away", () => {
        const field = schema.sections[0].fields.find((f) => f.type === "text" && f.maxLength)!;
        const path = `${schema.sections[0].key}.${field.key}`;
        const tooLong = "x".repeat((field.maxLength ?? 0) + 1);

        useEditorStore.getState().setContentValue(path, tooLong);

        const [sectionKey, fieldKey] = path.split(".");
        expect(useEditorStore.getState().content[sectionKey][fieldKey]).toBe(tooLong);
    });

    it("clears the message once the value fits again", () => {
        const field = schema.sections[0].fields.find((f) => f.type === "text" && f.maxLength)!;
        const path = `${schema.sections[0].key}.${field.key}`;

        useEditorStore.getState().setContentValue(path, "x".repeat((field.maxLength ?? 0) + 1));
        useEditorStore.getState().setContentValue(path, "Short enough");

        expect(useEditorStore.getState().contentIssues[path]).toBeUndefined();
        expect(page()).toContain("Short enough");
    });

    it("does nothing at all for a field the schema does not have", () => {
        const before = page();
        useEditorStore.getState().setContentValue("hero.not_a_field", "x");

        expect(page()).toBe(before);
        expect(useEditorStore.getState().contentIssues["hero.not_a_field"]).toBeUndefined();
    });
});

describe("a repeatable list", () => {
    it("adds a blank item shaped by the item schema", () => {
        const { path, field } = listPath();
        const before = items().length;

        useEditorStore.getState().addListItem(path);

        expect(items()).toHaveLength(before + 1);
        expect(Object.keys(items().at(-1)!)).toEqual(field.itemSchema!.map((f) => f.key));
    });

    it("fills an item in and the page follows", () => {
        const { path, field } = listPath();
        const key = field.itemSchema![0].key;

        useEditorStore.getState().addListItem(path);
        useEditorStore.getState().setListItemValue(path, items().length - 1, key, "Cold brew");

        expect(items().at(-1)![key]).toBe("Cold brew");
        expect(page()).toContain("Cold brew");
    });

    it("removes the right one", () => {
        const { path, field } = listPath();
        const key = field.itemSchema![0].key;
        const before = items();

        useEditorStore.getState().removeListItem(path, 0);

        expect(items()).toHaveLength(before.length - 1);
        expect(items()[0][key]).toBe(before[1][key]);
    });

    it("moves an item up and down again, ending where it started", () => {
        const { path } = listPath();
        const before = items();

        useEditorStore.getState().moveListItem(path, 1, "up");
        expect(items()[0]).toEqual(before[1]);

        useEditorStore.getState().moveListItem(path, 0, "down");
        expect(items()).toEqual(before);
    });

    it("will not move the first item up or the last one down", () => {
        const { path } = listPath();
        const before = items();

        useEditorStore.getState().moveListItem(path, 0, "up");
        useEditorStore.getState().moveListItem(path, before.length - 1, "down");

        expect(items()).toEqual(before);
    });

    it("survives being emptied entirely", () => {
        const { path } = listPath();

        for (let i = items().length; i > 0; i--) useEditorStore.getState().removeListItem(path, 0);
        expect(items()).toEqual([]);

        useEditorStore.getState().addListItem(path);
        expect(items()).toHaveLength(1);
    });
});

describe("a project with no schema", () => {
    it("ignores content edits rather than corrupting the page", () => {
        useEditorStore.setState({ contentSchema: null });
        const before = page();

        useEditorStore.getState().setContentValue("hero.headline", "Nope");
        useEditorStore.getState().addListItem("menu.items");

        expect(page()).toBe(before);
    });
});
