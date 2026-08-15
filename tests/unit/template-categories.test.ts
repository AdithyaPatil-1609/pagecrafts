import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CATEGORIES } from "@/lib/ai/schemas";
import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import { TEMPLATES } from "@/lib/templates";

// The category enum has fallen behind the database twice: once by seven values, then by
// fifteen. Both times it was harmless right up until it wasn't, because nothing inserts a
// template row yet — so the gap was invisible to every test and every code review, and was
// found by reading the schema.
//
// A category lives in four places, and they only stay in step if something checks:
//
//   the Category type              src/lib/contracts/template.ts
//   the classifier's runtime list  src/lib/ai/schemas.ts     (exhaustive against the type)
//   the label the tile shows       src/lib/discovery/categories.ts
//   the database enum              supabase/migrations/*.sql
//
// The type and the runtime list already check each other at compile time. This checks the
// other two.

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

/** Every value template_category holds after all migrations have run. */
function databaseCategories(): Set<string> {
    const files = readdirSync(MIGRATIONS).sort();
    const values = new Set<string>();

    for (const file of files) {
        const sql = readFileSync(join(MIGRATIONS, file), "utf8");

        const created = /create type public\.template_category as enum \(([^)]*)\)/.exec(sql);
        if (created) {
            for (const match of created[1]!.matchAll(/'([a-z_]+)'/g)) values.add(match[1]!);
        }

        for (const match of sql.matchAll(
            /alter type public\.template_category add value if not exists '([a-z_]+)'/g,
        )) {
            values.add(match[1]!);
        }
    }

    return values;
}

describe("the category enum and the database agree", () => {
    it("every category the code knows exists in the database", () => {
        const db = databaseCategories();
        const missing = Object.keys(CATEGORY_LABELS).filter((c) => !db.has(c));

        expect(
            missing,
            `add these to template_category in a migration: ${missing.join(", ")}`,
        ).toEqual([]);
    });

    it("the database holds nothing the code has forgotten about", () => {
        // The other direction matters less — an unused enum value is harmless — but it
        // catches a category that was removed from the code without a plan for the rows
        // still carrying it.
        const known = new Set<string>(Object.keys(CATEGORY_LABELS));
        const orphaned = [...databaseCategories()].filter((c) => !known.has(c));

        expect(orphaned, `in the database but not in the code: ${orphaned.join(", ")}`).toEqual([]);
    });
});

describe("every category is complete in the code", () => {
    it("the classifier's list and the labels cover the same set", () => {
        expect([...CATEGORIES].sort()).toEqual(Object.keys(CATEGORY_LABELS).sort());
    });

    it("every label is something a non-technical reader can read", () => {
        for (const [category, label] of Object.entries(CATEGORY_LABELS)) {
            expect(label.trim(), category).not.toBe("");
            // A label is what appears on a tile; a bucket key leaking through would show as
            // "health_wellness" rather than "Health & Wellness".
            expect(label, category).not.toMatch(/_/);
        }
    });

    it("every design's category is one the code knows", () => {
        for (const template of TEMPLATES) {
            expect(CATEGORY_LABELS[template.category], `${template.id}`).toBeDefined();
        }
    });
});
