import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium, type Browser } from "@playwright/test";
import sharp from "sharp";

import { TEMPLATES } from "../src/lib/templates";

// Thumbnails for the design library (R2 D18).
//
//   npm run templates:thumbs
//
// Every template record has advertised `thumbnailUrl` since the beginning and not one of
// those files has ever existed — `public/templates/` was not even a directory.
// thumbnailUrlFor() has been answering null on purpose so nobody rendered a broken image,
// and the gallery has been drawing a miniature parsed out of each design's own markup
// instead. This is the pipeline that was missing.
//
// A design is two files, index.html and styles.css, and it is self-contained apart from its
// photograph. So the render is honest in a way a mock-up could not be: Chromium is shown the
// exact bytes a customer's site is built from, at a desktop width, and the picture is
// whatever that produces. A thumbnail cannot advertise a layout the design does not have,
// because it is a photograph of the design.
//
// WHY THE FILES LIVE IN THE REPOSITORY
//
// The week-4 plan said Supabase Storage. Static files under public/ turned out to be better
// on the merits, not merely easier:
//
//   · They are versioned with the design. designs.ts and its thumbnail move in one commit,
//     so the picture cannot drift from the thing it depicts — which is the one real cost of
//     a rendered thumbnail over a parsed miniature, and this removes it.
//   · No credential, no bucket policy, no egress. They are served by the CDN in front of the
//     app, immutably cached, with nothing to rotate.
//   · A pull request shows the diff. A design change that alters the picture is reviewable
//     as a picture.
//
// The cost is repository size, which is why these are WebP and why the budget below is
// enforced rather than hoped for. thumbnailUrlFor() still prefers a storage base when one is
// configured, so moving them later is one environment variable and no code.

const OUT_DIR = join(process.cwd(), "public", "templates");
const MANIFEST = join(process.cwd(), "src", "lib", "templates", "thumbnail-manifest.json");

// 16:10, the aspect the tile and the detail modal already draw at. Rendered at twice the
// tile's CSS width so it stays sharp on a dense screen, and no larger — a thumbnail nobody
// can see the extra pixels of is bytes spent on nothing.
const VIEWPORT = { width: 1280, height: 800 };
const OUTPUT = { width: 640, height: 400 };

// Per-file and total ceilings. A thumbnail that blows through these is not a thumbnail, and
// finding that out in review is far better than finding it out in a clone.
const MAX_BYTES_EACH = 60 * 1024;
const MAX_BYTES_TOTAL = 4 * 1024 * 1024;

const WEBP = { quality: 72, effort: 5 } as const;

/** The design as a browser sees it: its own markup, with its own stylesheet inlined. */
function documentFor(files: Record<string, string>): string {
    const html = files["index.html"] ?? "";
    const css = files["styles.css"] ?? "";

    // The stylesheet is referenced as a relative path the page cannot resolve from a data
    // URL, so it is inlined rather than served. Substitution, not rewriting: the <link> is
    // replaced in place so nothing else about the document changes.
    let doc = html.replace(
        /<link\b[^>]*rel="stylesheet"[^>]*>/i,
        `<style>${css}</style>`,
    );

    // Headless Chromium sometimes negotiates AVIF from Unsplash (`auto=format`) and then
    // screenshots a black frame even though naturalWidth > 0. Pin JPEG for the shoot so
    // every gallery tile gets the photograph the design ships.
    doc = doc.replace(
        /(https:\/\/images\.unsplash\.com\/[^"'?\s]+)\?([^"'?\s]*)/g,
        (_match, base: string, query: string) => {
            const params = new URLSearchParams(query.replace(/&amp;/g, "&"));
            params.delete("auto");
            params.set("fm", "jpg");
            return `${base}?${params.toString()}`;
        },
    );

    return doc;
}

async function shoot(browser: Browser, id: string, html: string): Promise<number> {
    const page = await browser.newPage({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
    });

    try {
        await page.setContent(html, { waitUntil: "load" });

        // Force every hero photograph to start fetching. `loading="lazy"` (and some
        // headless intersection quirks with absolute full-bleed frames) used to leave
        // blank dark tiles in the gallery — exactly the failure this pipeline exists to
        // prevent.
        await page.evaluate(() => {
            for (const img of Array.from(document.images)) {
                img.loading = "eager";
                img.setAttribute("fetchpriority", "high");
                // Kick the loader even when the browser thought the image was off-screen.
                if (!img.complete || img.naturalWidth === 0) {
                    const { src } = img;
                    img.removeAttribute("src");
                    img.src = src;
                }
            }
        });

        // The hero photograph is the whole character of most of these designs.
        // `complete` alone is not enough — AVIF/WebP can report naturalWidth before the
        // frame is painted, which left blank dark tiles (law-firm, dance-studio, …).
        // Decode the bitmap, then wait two animation frames so Chromium composites it.
        const painted = await page
            .evaluate(async () => {
                const images = Array.from(document.images);
                const results = await Promise.all(
                    images.map(async (img) => {
                        try {
                            await img.decode();
                        } catch {
                            // Broken URL — still "done", just without pixels.
                        }
                        return img.naturalWidth > 0;
                    }),
                );
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
                );
                return results.every(Boolean) || images.length === 0;
            })
            .catch(() => false);

        if (!painted) {
            console.warn(`  ${id}: an image did not load; shooting without it`);
        }

        // Prefer JPEG from Unsplash when the original request negotiated AVIF and still
        // left a blank paint — rare, but cheaper than shipping a dark rectangle.
        if (!painted) {
            await page.evaluate(() => {
                for (const img of Array.from(document.images)) {
                    if (img.naturalWidth > 0) continue;
                    try {
                        const url = new URL(img.src);
                        url.searchParams.set("fm", "jpg");
                        url.searchParams.delete("auto");
                        img.src = url.toString();
                    } catch {
                        /* keep original */
                    }
                }
            });
            await page
                .evaluate(async () => {
                    await Promise.all(
                        Array.from(document.images).map((img) => img.decode().catch(() => undefined)),
                    );
                    await new Promise<void>((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
                    );
                })
                .catch(() => undefined);
        }

        const png = await page.screenshot({ type: "png" });

        const webp = await sharp(png)
            .resize(OUTPUT.width, OUTPUT.height, { fit: "cover", position: "top" })
            .webp(WEBP)
            .toBuffer();

        writeFileSync(join(OUT_DIR, `${id}.webp`), webp);
        return webp.byteLength;
    } finally {
        await page.close();
    }
}

async function main(): Promise<void> {
    // Optional: `npm run templates:thumbs -- law-firm startup` re-renders only those ids
    // and leaves the rest of public/templates/ alone. A full run (no args) still rebuilds
    // from empty so renamed/removed designs cannot leave orphan files behind.
    const only = new Set(process.argv.slice(2).filter((arg) => !arg.startsWith("-")));
    const targets = only.size > 0
        ? TEMPLATES.filter((template) => only.has(template.id))
        : TEMPLATES;

    if (only.size > 0 && targets.length !== only.size) {
        const known = new Set(TEMPLATES.map((template) => template.id));
        const missing = [...only].filter((id) => !known.has(id));
        console.error(`Unknown template id(s): ${missing.join(", ")}`);
        process.exit(1);
    }

    if (only.size === 0) {
        // Rebuilt from empty every time. A leftover file for a design that has been renamed or
        // removed is a thumbnail of something that no longer exists, and it would keep being
        // served because the manifest is the only thing that ever looks.
        rmSync(OUT_DIR, { recursive: true, force: true });
    }
    mkdirSync(OUT_DIR, { recursive: true });

    console.log(`Rendering ${targets.length} designs at ${OUTPUT.width}x${OUTPUT.height}.\n`);

    const browser = await chromium.launch();
    const sizes: { id: string; bytes: number }[] = [];

    try {
        for (const template of targets) {
            const bytes = await shoot(browser, template.id, documentFor(template.files));
            sizes.push({ id: template.id, bytes });
            process.stdout.write(
                `  ${template.id.padEnd(28)} ${(bytes / 1024).toFixed(1).padStart(6)} KB\n`,
            );
        }
    } finally {
        await browser.close();
    }

    // The manifest is what thumbnailUrlFor() reads. A design absent from it gets null and the
    // gallery draws the miniature — which is why a partial run degrades rather than breaks.
    // Selective runs keep every existing id; full runs replace the list.
    const existing = only.size > 0
        ? readdirSync(OUT_DIR)
            .filter((f) => f.endsWith(".webp"))
            .map((f) => f.replace(/\.webp$/, ""))
        : sizes.map((s) => s.id);
    const ids = [...new Set(existing)].sort();
    writeFileSync(MANIFEST, `${JSON.stringify(ids, null, 2)}\n`);

    const total = sizes.reduce((sum, s) => sum + s.bytes, 0);
    const biggest = [...sizes].sort((a, b) => b.bytes - a.bytes).slice(0, 3);
    const overBudget = sizes.filter((s) => s.bytes > MAX_BYTES_EACH);

    console.log(
        `\n${sizes.length} thumbnails · ${(total / 1024 / 1024).toFixed(2)} MB · ` +
            `${(total / sizes.length / 1024).toFixed(1)} KB average`,
    );
    console.log(`largest: ${biggest.map((s) => `${s.id} ${(s.bytes / 1024).toFixed(0)}KB`).join(", ")}`);

    if (overBudget.length > 0) {
        console.error(
            `\n${overBudget.length} over the ${MAX_BYTES_EACH / 1024}KB per-file budget:\n` +
                overBudget.map((s) => `  ${s.id} ${(s.bytes / 1024).toFixed(1)}KB`).join("\n"),
        );
        process.exit(1);
    }

    if (only.size === 0) {
        if (total > MAX_BYTES_TOTAL) {
            console.error(
                `\nTotal ${(total / 1024 / 1024).toFixed(2)} MB is over the ` +
                    `${MAX_BYTES_TOTAL / 1024 / 1024} MB budget for the repository.`,
            );
            process.exit(1);
        }

        const written = readdirSync(OUT_DIR).filter((f) => f.endsWith(".webp"));
        if (written.length !== TEMPLATES.length) {
            console.error(`\nWrote ${written.length} files for ${TEMPLATES.length} designs.`);
            process.exit(1);
        }
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
