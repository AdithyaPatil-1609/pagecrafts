/**
 * Render desktop + mobile thumbnails from catalogue drafts (TC-126, TC-131).
 *
 * Deterministic SVG so a re-run is byte-identical. Preethi's HTML renderer can
 * replace this later without changing the output path.
 *
 *   npx tsx scripts/render-thumbnails.ts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    compositionThumbnail, DESKTOP, MOBILE,
} from '../src/lib/ai/catalogue/thumbnails';
import { parseStoredComposition } from '../src/lib/ai/composition/migrate';

const DRAFTS = join(process.cwd(), 'evals/catalogue/drafts');
const OUT = join(process.cwd(), 'evals/catalogue/thumbs');

function main(): void {
    mkdirSync(OUT, { recursive: true });
    const files = readdirSync(DRAFTS).filter((f) => f.endsWith('.json'));

    for (const file of files) {
        const slug = file.replace(/\.json$/, '');
        const composition = parseStoredComposition(
            JSON.parse(readFileSync(join(DRAFTS, file), 'utf8')),
        );
        writeFileSync(join(OUT, `${slug}.desktop.svg`), compositionThumbnail(composition, DESKTOP));
        writeFileSync(join(OUT, `${slug}.mobile.svg`), compositionThumbnail(composition, MOBILE));
        console.log(`  ${slug}`);
    }
}

main();
