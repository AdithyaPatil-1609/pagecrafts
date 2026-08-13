import { createClient } from "@supabase/supabase-js";

import { TEMPLATES } from "../src/lib/templates";
import { templateUuid } from "../src/lib/templates/template-id";

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

const DB_CATEGORIES = new Set([
    "portfolio", "restaurant", "saas", "blog", "event",
    "resume", "agency", "store", "nonprofit", "other",
    "fitness", "food", "photography", "architecture", "education", "travel", "business",
    "beauty", "real_estate", "healthcare", "design", "professional_services", "entertainment",
]);

/** The row shape `templates` expects, built from a library design. */
export function templateRow(template: (typeof TEMPLATES)[number]) {
    const thumbnailUrl = template.thumbnailUrl.startsWith("http")
        ? template.thumbnailUrl
        : `https://images.pagecraft.test${template.thumbnailUrl}`;

    const category = DB_CATEGORIES.has(template.category) ? template.category : "other";

    return {
        id: templateUuid(template.id),
        name: template.name,
        description: template.description,
        category,
        tags: template.tags,
        thumbnail_url: thumbnailUrl,
        files: template.files,
        content_schema: template.contentSchema,
        license: template.license,
        source_url: template.sourceUrl,
        // What the design costs, so the fork check can read it from the row rather than
        // trusting whoever is asking (R3 D8).
        tier: template.tier,
    };
}

const SEED_TEMPLATES = [
    {
        id: "aaaaaaaa-0000-4000-8000-000000000001",
        name: "Ember",
        description: "A warm, dark single-page site for restaurants and cafes.",
        category: "restaurant",
        tags: ["dark", "one-page", "warm"],
        thumbnail_url: "https://images.pagecraft.test/templates/ember.png",
        files: {
            "index.html":
                '<!doctype html><html><head><meta charset="utf-8"><title>Ember</title><link rel="stylesheet" href="styles.css"></head><body><h1 data-slot="hero.title">Ember Kitchen</h1><p data-slot="hero.tagline">Wood-fired, every evening.</p></body></html>',
            "styles.css":
                "body{font-family:system-ui;background:#140f0d;color:#f5ede6;margin:0;padding:4rem 2rem}h1{color:#e07a3f}",
        },
        content_schema: {
            sections: [
                {
                    key: "hero",
                    label: "Hero",
                    fields: [
                        { key: "title", label: "Restaurant name", type: "text", maxLength: 60 },
                        { key: "tagline", label: "Tagline", type: "text", maxLength: 120 },
                    ],
                },
            ],
        },
        license: "MIT",
        source_url: "https://github.com/pagecraft/templates",
        tier: "free",
    },
    {
        id: "aaaaaaaa-0000-4000-8000-000000000002",
        name: "Slate",
        description: "A quiet, minimal portfolio for designers and photographers.",
        category: "portfolio",
        tags: ["dark", "minimal", "one-page"],
        thumbnail_url: "https://images.pagecraft.test/templates/slate.png",
        files: {
            "index.html":
                '<!doctype html><html><head><meta charset="utf-8"><title>Slate</title><link rel="stylesheet" href="styles.css"></head><body data-slot="intro.accent" data-slot-var="--accent" style="--accent: #8ab4f8"><h1 data-slot="intro.name">Your Name</h1><p data-slot="intro.bio">Photographer, based somewhere.</p></body></html>',
            "styles.css":
                "body{font-family:system-ui;background:#0f1115;color:#e7e9ee;margin:0;padding:4rem 2rem}h1{letter-spacing:-0.02em}",
        },
        content_schema: {
            sections: [
                {
                    key: "intro",
                    label: "Introduction",
                    fields: [
                        { key: "name", label: "Your name", type: "text", maxLength: 60 },
                        { key: "bio", label: "Short bio", type: "richtext", maxLength: 400 },
                        { key: "accent", label: "Accent colour", type: "color" },
                    ],
                },
            ],
        },
        license: "MIT",
        source_url: "https://github.com/pagecraft/templates",
        tier: "free",
    },
    {
        id: "aaaaaaaa-0000-4000-8000-000000000003",
        name: "Ledger",
        description: "A clean marketing page for small software products.",
        category: "saas",
        tags: ["light", "marketing", "multi-section"],
        thumbnail_url: "https://images.pagecraft.test/templates/ledger.png",
        files: {
            "index.html":
                '<!doctype html><html><head><meta charset="utf-8"><title>Ledger</title><link rel="stylesheet" href="styles.css"></head><body><h1 data-slot="hero.headline">Ship faster</h1><ul class="cards" data-slot-list="features.items"><li class="card"><h3 data-slot="features.items.0.title">Fast</h3><p data-slot="features.items.0.body">Ships on the day you decide to.</p></li></ul><form class="form" action="" method="post"><input type="email" name="email" placeholder="you@example.com" aria-label="Email" required /><button type="submit">Get in touch</button></form></body></html>',
            "styles.css":
                "body{font-family:system-ui;background:#ffffff;color:#111827;margin:0;padding:4rem 2rem}h1{font-size:2.5rem}",
        },
        content_schema: {
            sections: [
                {
                    key: "hero",
                    label: "Hero",
                    fields: [{ key: "headline", label: "Headline", type: "text", maxLength: 80 }],
                },
                {
                    key: "features",
                    label: "Features",
                    fields: [
                        {
                            key: "items",
                            label: "Feature list",
                            type: "list",
                            itemSchema: [
                                { key: "title", label: "Title", type: "text", maxLength: 60 },
                                { key: "body", label: "Description", type: "text", maxLength: 200 },
                            ],
                        },
                    ],
                },
            ],
        },
        license: "MIT",
        source_url: "https://github.com/pagecraft/templates",
        tier: "free",
    },
];

async function main(): Promise<void> {
    const { url, key } = requireEnv();
    const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = [...SEED_TEMPLATES, ...TEMPLATES.map(templateRow)];

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
