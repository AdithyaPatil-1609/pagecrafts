import { createClient } from "@supabase/supabase-js";

import { TEMPLATES } from "../src/lib/templates";
import { templateRow, writeLibraryRows } from "../src/lib/templates/row";

export { templateRow };

// Load the design library into the `templates` table (R3 D8).
//
//   npm run templates:seed
//
// The library is authored as code — one blueprint per design in lib/templates/designs.ts —
// and the gallery reads it from there. Fork cannot: a project's source_template_id is a
// foreign key into `templates`, so a design has to exist as a row before anybody can make a
// site from it. Until this runs, pressing "Use this design" has nothing to point at.
//
// Upsert on the primary key, with the id derived from the slug (see template-id.ts), so
// running it twice updates the designs in place rather than making a second copy of the
// library. That also means re-running it is how a corrected design reaches the table.
//
// Service role, because `templates` is public to read and closed to write — which is the
// right way round for a library nobody but us should be able to edit.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function requireEnv(): { url: string; key: string } {
    if (!URL || !SERVICE_ROLE) {
        console.error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
                "Run with: npm run templates:seed",
        );
        process.exit(1);
    }
    return { url: URL, key: SERVICE_ROLE };
}

async function main(): Promise<void> {
    const { url, key } = requireEnv();
    const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = TEMPLATES.map((template) => templateRow(template));
    const BATCH = 20;
    let written = 0;
    const usedOther: string[] = [];

    for (let i = 0; i < TEMPLATES.length; i += BATCH) {
        const batch = TEMPLATES.slice(i, i + BATCH);
        const result = await writeLibraryRows(supabase, batch);

        if (result.error) {
            console.error(`Failed on designs ${i + 1}-${i + batch.length}: ${result.error.message}`);
            process.exit(1);
        }

        usedOther.push(...result.usedOther);
        written += batch.length;
        console.log(`  seeded ${written}/${TEMPLATES.length}`);
    }

    console.log(`\nDone. ${written} designs are in the templates table.`);
    console.log(`First: ${rows[0]?.name} -> ${rows[0]?.id}`);
    if (usedOther.length > 0) {
        console.log(
            `\n${usedOther.length} designs were stored as category "other" because this database is missing newer category values.`,
        );
        console.log(
            "That does not block the editor. Paste supabase/migrations/20260817140000_template_categories_library.sql into the Supabase SQL editor, then run npm run templates:seed again if you want the real buckets.",
        );
    }
}

// Guarded so the row builder above can be imported by tests without running the seed.
if (process.argv[1]?.includes("seed-templates")) {
    void main();
}
