/**
 * Render desktop + mobile thumbnails from catalogue drafts (TC-126, TC-131).
 *
 * Headless Chromium screenshots of `compositionToHtml` (AC-F4-10). HTML is the
 * byte-identical artefact; PNGs are the gallery thumbs.
 *
 *   npx tsx scripts/render-thumbnails.ts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { DESKTOP, MOBILE, type ThumbnailSize } from '../src/lib/ai/catalogue/thumbnails';
import { parseStoredComposition } from '../src/lib/ai/composition/migrate';
import { compositionToHtml } from '../src/lib/render/composition-html';

const DRAFTS = join(process.cwd(), 'evals/catalogue/drafts');
const OUT = join(process.cwd(), 'evals/catalogue/thumbs');

async function screenshot(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    html: string,
    size: ThumbnailSize,
    dest: string,
): Promise<void> {
    const page = await browser.newPage({
        viewport: { width: size.width, height: size.height },
        reducedMotion: 'reduce',
    });
    try {
        await page.setContent(html, { waitUntil: 'load' });
        await page.screenshot({ path: dest, type: 'png' });
    } finally {
        await page.close();
    }
}

async function main(): Promise<void> {
    mkdirSync(OUT, { recursive: true });
    const files = readdirSync(DRAFTS).filter((f) => f.endsWith('.json')).sort();
    if (files.length === 0) {
        throw new Error(`No drafts in ${DRAFTS}. Run npm run catalogue:build first.`);
    }

    const browser = await chromium.launch();
    try {
        for (const file of files) {
            const slug = file.replace(/\.json$/, '');
            const composition = parseStoredComposition(
                JSON.parse(readFileSync(join(DRAFTS, file), 'utf8')),
            );
            const html = compositionToHtml(composition);
            writeFileSync(join(OUT, `${slug}.html`), html);
            await screenshot(browser, html, DESKTOP, join(OUT, `${slug}.desktop.png`));
            await screenshot(browser, html, MOBILE, join(OUT, `${slug}.mobile.png`));
            console.log(`  ${slug}`);
        }
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
