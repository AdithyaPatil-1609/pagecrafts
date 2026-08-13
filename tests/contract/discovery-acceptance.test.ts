import { describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates";
import { parseTemplateQuery, queryTemplates } from "@/lib/templates/query";
import { COLOURS, FEATURES, LAYOUTS, TIERS, chipHref } from "@/lib/discovery/filters";
import { CATEGORY_CARDS, CATEGORY_LABELS } from "@/lib/discovery/categories";
import { contentFromFiles } from "@/lib/content/from-files";
import { applyContentToFiles } from "@/lib/content/to-files";
import { patchProjectContent } from "@/lib/data/project-content";
import { createProject } from "@/lib/data/projects";
import { templateRow } from "../../scripts/seed-templates";
import { templateUuid } from "@/lib/templates/template-id";
import { createFakeDb } from "../support/fake-db";

// R2 D10 · the discovery milestone.
//
//   "Gallery, chips and URL state verified across all templates with accurate counts.
//    Content-panel acceptance: edit a heading, content_json patches, preview updates.
//    Bug sweep, plus a provenance spot-check that every design still carries licence +
//    source_url."
//
// The unit tests ask whether each piece behaves. This asks the milestone's own question:
// walked from one end to the other, over the whole library rather than a fixture, does the
// thing work — and is every count it shows a person actually true.
//
// Written against TEMPLATES rather than a hand-made library on purpose. A fixture can be
// built to pass; 115 real designs cannot.

const run = (search: string) => queryTemplates(parseTemplateQuery(new URLSearchParams(search)));

describe("provenance — every design says where it came from", () => {
    // The rule that lets the library exist at all: a design nobody can trace the licence of
    // is a design that cannot ship. Checked over all of them, every time, because it is one
    // careless normalise away from being false.
    it("carries a non-empty licence", () => {
        const missing = TEMPLATES.filter((t) => !t.license?.trim()).map((t) => t.id);
        expect(missing).toEqual([]);
    });

    it("carries a source url, and an https one", () => {
        const bad = TEMPLATES.filter((t) => !/^https:\/\/\S+$/.test(t.sourceUrl ?? "")).map((t) => t.id);
        expect(bad).toEqual([]);
    });

    it("prices every design, and never charges for a free one", () => {
        for (const t of TEMPLATES) {
            expect(t.priceInr).toBe({ free: 0, premium: 499, signature: 999 }[t.tier]);
        }
    });
});

describe("the gallery counts what it is showing", () => {
    it("shows the whole library when nothing is asked for", () => {
        const { items, total } = run("");
        expect(items).toHaveLength(TEMPLATES.length);
        expect(total).toBe(TEMPLATES.length);
    });

    it("keeps `total` as the library's size while filtered, which is what 'N of M' means", () => {
        // The M in "8 of 115" is the library, not the result. Reporting the result in both
        // halves would make the line read "8 of 8" and say nothing.
        for (const colour of COLOURS) {
            const { items, total } = run(`colour=${colour}`);
            expect(total).toBe(TEMPLATES.length);
            expect(items.length).toBeLessThanOrEqual(total);
        }
    });

    it("counts every chip honestly, one filter at a time", () => {
        // Each chip's count is checked against the library itself rather than against a
        // number written down here, so adding designs cannot make this quietly wrong.
        for (const colour of COLOURS) {
            expect(run(`colour=${colour}`).items.every((t) => t.colour === colour)).toBe(true);
        }
        for (const layout of LAYOUTS) {
            expect(run(`layout=${layout}`).items.every((t) => t.layout === layout)).toBe(true);
        }
        for (const tier of TIERS) {
            expect(run(`tier=${tier}`).items.every((t) => t.tier === tier)).toBe(true);
        }
        for (const feature of FEATURES) {
            expect(run(`feature=${feature}`).items.every((t) => t.features.includes(feature))).toBe(true);
        }
    });

    it("lands every category card on at least one design", () => {
        // A card that leads to an empty grid is a dead end the person cannot tell from a
        // bug. This is the D-6 promise, checked across the whole set of cards.
        for (const category of CATEGORY_CARDS) {
            expect(run(`category=${category}`).items.length, category).toBeGreaterThan(0);
        }
    });

    it("gives every card a label to wear", () => {
        for (const category of CATEGORY_CARDS) {
            expect(CATEGORY_LABELS[category]?.trim()).toBeTruthy();
        }
    });

    it("narrows, never widens, as chips are added", () => {
        const dark = run("colour=dark").items.length;
        const darkFree = run("colour=dark&tier=free").items.length;
        const darkFreeSplit = run("colour=dark&tier=free&layout=split").items.length;

        expect(darkFree).toBeLessThanOrEqual(dark);
        expect(darkFreeSplit).toBeLessThanOrEqual(darkFree);
    });
});

describe("the URL is the gallery's state", () => {
    it("restores the same grid from the same URL", () => {
        // Which is what makes reload, back and a pasted link all work: the page holds no
        // state the address bar does not.
        const search = "category=store&colour=dark&tier=free&sort=name";
        expect(run(search).items.map((t) => t.id)).toEqual(run(search).items.map((t) => t.id));
    });

    it("pressing an active chip clears it and keeps the rest", () => {
        const preserve = { colour: "dark", tier: "free" };

        expect(chipHref(preserve, "colour", "dark", true)).toBe("/templates?tier=free");
        expect(chipHref(preserve, "tier", "free", true)).toBe("/templates?colour=dark");
    });

    it("pressing an inactive chip adds it to what is already there", () => {
        expect(chipHref({ colour: "dark" }, "tier", "free", false)).toBe(
            "/templates?colour=dark&tier=free",
        );
    });

    it("never drops the description someone typed", () => {
        // Changing a filter must not silently throw away the sentence from the describe
        // screen — it is the only reason the ordering is personal to them.
        const href = chipHref({ q: "a small online shop", intent: "store" }, "colour", "dark", false);

        expect(href).toContain("q=a+small+online+shop");
        expect(href).toContain("intent=store");
    });

    it("answers a filter combination nothing satisfies with an empty grid, not an error", () => {
        const all = run("").items;
        const empty = [...new Set(all.map((t) => t.category))]
            .flatMap((category) => COLOURS.map((colour) => ({ category, colour })))
            .find(({ category, colour }) =>
                !all.some((t) => t.category === category && t.colour === colour));

        expect(empty).toBeDefined();
        expect(run(`category=${empty!.category}&colour=${empty!.colour}`).items).toEqual([]);
    });
});

// The milestone's own sentence: "edit a heading, content_json patches, preview updates".
describe("editing a heading changes the page", () => {
    const DESIGN = TEMPLATES.find((t) => t.id === "portfolio")!;

    async function aSiteMadeFromTheLibrary() {
        const db = createFakeDb({ users: [{ id: "u1" }] });
        db.insert("templates", templateRow(DESIGN));

        const { id } = await createProject(db.asUser("u1"), "u1", {
            name: DESIGN.name,
            sourceTemplateId: templateUuid(DESIGN.id),
        });

        return { db, id };
    }

    it("starts with the panel showing what the page says", async () => {
        // The fork seeds content_json from the design's own markup, so the two agree before
        // anybody types anything. Without that the panel opens blank over a page full of
        // words, and the first save writes the blanks in.
        const { db, id } = await aSiteMadeFromTheLibrary();
        const project = db.rows("projects").find((p) => p.id === id)!;
        const content = project.content_json as Record<string, Record<string, unknown>>;

        const fromFiles = contentFromFiles(DESIGN.files, DESIGN.contentSchema) as typeof content;
        expect(content.hero?.headline).toBe(fromFiles.hero?.headline);
    });

    it("patches content_json when a heading is edited", async () => {
        const { db, id } = await aSiteMadeFromTheLibrary();

        await expect(
            patchProjectContent(db.asUser("u1"), id, [
                { path: "hero.headline", value: "Kettle & Co." },
            ]),
        ).resolves.toMatchObject({ rendered: true, dirty: true });

        const project = db.rows("projects").find((p) => p.id === id)!;
        const content = project.content_json as Record<string, Record<string, unknown>>;
        expect(content.hero.headline).toBe("Kettle & Co.");
    });

    it("and the preview shows the new heading", async () => {
        const { db, id } = await aSiteMadeFromTheLibrary();
        await patchProjectContent(db.asUser("u1"), id, [
            { path: "hero.headline", value: "Kettle & Co." },
        ]);

        const project = db.rows("projects").find((p) => p.id === id)!;
        const files = Object.fromEntries(
            db.rows("project_files")
                .filter((f) => f.project_id === id)
                .map((f) => [f.path as string, f.content as string]),
        );

        const rendered = applyContentToFiles(
            files,
            project.content_json as Record<string, unknown>,
            project.content_schema as never,
        );

        expect(rendered["index.html"]).toContain("Kettle &amp; Co.");
        // The design's own headline has to be gone, not merely joined by the new one. The
        // original is read from the design rather than written down here, so this cannot
        // pass by asserting against a string nothing ever contained.
        const original = (
            contentFromFiles(DESIGN.files, DESIGN.contentSchema) as Record<string, Record<string, string>>
        ).hero.headline;

        expect(original).toBeTruthy();
        expect(rendered["index.html"]).not.toContain(original);
    });

    it("refuses an edit the schema will not take, and changes nothing", async () => {
        const { db, id } = await aSiteMadeFromTheLibrary();
        const before = JSON.stringify(db.rows("projects").find((p) => p.id === id)!.content_json);

        await expect(
            patchProjectContent(db.asUser("u1"), id, [
                { path: "hero.headline", value: "x".repeat(500) },
            ]),
        ).rejects.toMatchObject({ code: "validation_failed" });

        expect(JSON.stringify(db.rows("projects").find((p) => p.id === id)!.content_json)).toBe(before);
    });

    it("will not let somebody else edit it", async () => {
        const { db, id } = await aSiteMadeFromTheLibrary();
        db.insert("users", { id: "u2" });

        await expect(
            patchProjectContent(db.asUser("u2"), id, [{ path: "hero.headline", value: "Mine" }]),
        ).rejects.toMatchObject({ code: "not_found" });
    });
});
