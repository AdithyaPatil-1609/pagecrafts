import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates";

// The licence audit, as tests (R2 D16, C-06).
//
// The audit found that all 115 designs recorded a source_url of
// github.com/pagecraft/templates — a repository that has never existed. Nothing was taken
// from anyone; the field simply described an origin that was not real, which is the exact
// failure C-06 is written to prevent. It survived nine template batches because every check
// asked whether the field was non-empty, and it always was.
//
// So these check that the value points somewhere a person could actually go, rather than
// that somebody remembered to fill it in.

// A host we know does not host this project's templates. Kept by name because the phantom
// came back once already, through copy-paste into the seed.
const PHANTOM = "github.com/pagecraft/templates";

describe("every design's provenance can be checked by a person", () => {
    it("names a licence", () => {
        for (const t of TEMPLATES) {
            expect(t.license.trim(), `${t.id}: license`).not.toBe("");
        }
    });

    it("names a source that is an absolute https URL", () => {
        for (const t of TEMPLATES) {
            expect(t.sourceUrl, `${t.id}: source_url`).toMatch(/^https:\/\/[^\s]+$/);
        }
    });

    it("does not point at the repository that never existed", () => {
        for (const t of TEMPLATES) {
            expect(t.sourceUrl, `${t.id}: source_url is the phantom repo`).not.toContain(PHANTOM);
        }
    });

    it("keeps the phantom out of the seed as well", () => {
        // It reached the seed by copy-paste the first time, and the seed is what a fresh
        // database is built from.
        const seed = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");
        expect(seed).not.toContain(PHANTOM);
    });

    it("points first-party designs at a file that is in this repository", () => {
        // Every design in designs.ts is generated from a blueprint in that same file. The
        // honest source is therefore the file itself, and the test says so rather than
        // accepting any URL that happens to parse.
        for (const t of TEMPLATES) {
            expect(t.sourceUrl, `${t.id}`).toContain("github.com/AdithyaPatil-1609/pagecrafts");
        }
    });
});

// The photographs are a second provenance question, separate from the design's own licence:
// the markup embeds them, so they ship with a published site.
describe("the photographs the designs embed", () => {
    const heroes = TEMPLATES.flatMap((t) =>
        [...(t.files["index.html"] ?? "").matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => ({
            id: t.id,
            src: m[1]!,
        })),
    );

    it("are all served from Unsplash, whose licence allows use without attribution", () => {
        // If a design ever embeds an image from somewhere else, its licence has to be
        // established before it ships — that is a decision, and this fails so somebody
        // makes it rather than discovering the image on a customer's live site.
        for (const hero of heroes) {
            expect(hero.src, `${hero.id} embeds a non-Unsplash image`).toMatch(
                /^https:\/\/images\.unsplash\.com\//,
            );
        }
    });

    it("embeds at least one, so this test is looking at something", () => {
        expect(heroes.length).toBeGreaterThan(0);
    });
});
