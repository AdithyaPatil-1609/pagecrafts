import { createClient } from "@supabase/supabase-js";

import { TEMPLATES } from "../src/lib/templates";
import { templateUuid } from "../src/lib/templates/template-id";
import { thumbnailUrlFor } from "../src/lib/templates/thumbnails";

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

/** The row shape `templates` expects, built from a library design. */
export function templateRow(template: (typeof TEMPLATES)[number]) {
    return {
        id: templateUuid(template.id),
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        // The column only accepts https:// or null. Library designs still carry a
        // relative /templates/... path that would 404; thumbnailUrlFor is null until
        // rendered thumbnails exist, which is what the check allows.
        thumbnail_url: thumbnailUrlFor(template),
        files: template.files,
        content_schema: template.contentSchema,
        license: template.license,
        source_url: template.sourceUrl,
        // What the design costs, so the fork check can read it from the row rather than
        // trusting whoever is asking (R3 D8).
        tier: template.tier,
    };
}

async function main(): Promise<void> {
    const { url, key } = requireEnv();
    const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = TEMPLATES.map(templateRow);

    // In batches: the whole library is a few megabytes of markup, and one statement carrying
    // all of it is the kind of request a connection drops halfway through.
    const BATCH = 20;
    let written = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase.from("templates").upsert(batch, { onConflict: "id" });

        if (error) {
            console.error(`Failed on designs ${i + 1}-${i + batch.length}: ${error.message}`);
            process.exit(1);
        }

        written += batch.length;
        console.log(`  seeded ${written}/${rows.length}`);
    }

    console.log(`\nDone. ${written} designs are in the templates table.`);
    console.log(`First: ${rows[0]?.name} -> ${rows[0]?.id}`);
}

// Guarded so the row builder above can be imported by tests without running the seed.
if (process.argv[1]?.includes("seed-templates")) {
    void main();
}
