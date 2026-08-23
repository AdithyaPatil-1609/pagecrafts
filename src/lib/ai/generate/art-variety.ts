import type { ArtDirection, SectionKey } from '@/lib/contracts';
import { IMAGERY_IDS, MOTION_IDS, RADIUS_IDS, SPACING_IDS, THEME_IDS } from '@/lib/contracts';
import type { StyleId, StyleSpec } from './styles';

/**
 * One art direction per business, not one per tier.
 *
 * STYLE_SPECS pinned every look to a single ArtDirection, so every Photo-rich site in the
 * product shared one theme, one motion, one radius, one spacing and one imagery treatment.
 * Two restaurants got the same site with different words in it -- which is the thing the
 * Rs 499 tier is sold as not being.
 *
 * The catalogue was always deep enough: 8 themes x 6 motions x 5 radii x 3 spacings x 5
 * imagery styles is 3,600 combinations, and the product used three of them.
 *
 * Each tier keeps its character -- Casual stays quiet, Animated stays kinetic -- and varies
 * inside it. A tier that could draw from everything would sell three names for one thing.
 */

/** Only ids the renderer actually knows. Anything else silently falls back to the default. */
const VARIANTS: Partial<Record<SectionKey, readonly string[]>> = {
    hero: ['centred', 'split-image', 'image-bg', 'minimal'],
    about: ['text', 'media-split'],
    services: ['cards', 'grid', 'timeline'],
    menu: ['grouped', 'simple'],
    gallery: ['masonry', 'grid', 'carousel'],
    team: ['cards', 'grid'],
    testimonials: ['quotes', 'cards'],
    faq: ['accordion', 'two-column'],
    contact: ['split-map', 'simple', 'form'],
    footer: ['simple', 'columns'],
};

interface Palette {
    themes: readonly ArtDirection['themeId'][];
    motions: readonly ArtDirection['motionId'][];
    radii: readonly ArtDirection['radiusId'][];
    spacings: readonly ArtDirection['spacingId'][];
    imagery: readonly ArtDirection['imageryId'][];
    sections: Partial<Record<SectionKey, readonly string[]>>;
}

/**
 * What each tier is allowed to reach for.
 *
 * Casual holds still: a free site that animates like the paid one is a free site nobody
 * upgrades from. Photo-rich draws from everything, because "your design, not a template" is
 * the whole promise. Animated keeps the darker, higher-contrast end, where motion reads as
 * intent rather than noise.
 */
const PALETTES: Record<StyleId, Palette> = {
    casual: {
        themes: ['sunlit-craft', 'warm-editorial', 'calm-sage', 'clinical-blue', 'mono-precision'],
        motions: ['none', 'whisper'],
        radii: ['soft', 'organic', 'framed'],
        spacings: ['default', 'airy'],
        imagery: ['bright-clean', 'warm-natural', 'documentary'],
        sections: {
            hero: ['split-image', 'centred', 'minimal'],
            about: ['text', 'media-split'],
            services: ['cards', 'grid'],
            menu: ['simple', 'grouped'],
            testimonials: ['quotes'],
            contact: ['simple', 'form'],
            footer: ['simple'],
        },
    },
    photos: {
        themes: THEME_IDS,
        motions: ['whisper', 'calm', 'editorial', 'showcase'],
        radii: RADIUS_IDS,
        spacings: SPACING_IDS,
        imagery: IMAGERY_IDS,
        sections: {
            hero: ['image-bg', 'split-image', 'centred'],
            about: ['media-split', 'text'],
            services: ['cards', 'grid', 'timeline'],
            menu: ['grouped', 'simple'],
            gallery: ['masonry', 'grid', 'carousel'],
            team: ['cards', 'grid'],
            testimonials: ['quotes', 'cards'],
            faq: ['accordion', 'two-column'],
            contact: ['split-map', 'form', 'simple'],
            footer: ['columns', 'simple'],
        },
    },
    motion: {
        themes: ['vivid-energy', 'deep-luxury', 'tech-slate', 'mono-precision', 'clinical-blue'],
        motions: ['kinetic', 'showcase', 'editorial'],
        radii: ['pill', 'sharp', 'organic'],
        spacings: ['tight', 'default'],
        imagery: ['bold-contrast', 'muted-duotone', 'documentary'],
        sections: {
            hero: ['centred', 'image-bg', 'minimal'],
            about: ['text', 'media-split'],
            services: ['timeline', 'cards', 'grid'],
            gallery: ['carousel', 'masonry'],
            testimonials: ['cards', 'quotes'],
            faq: ['accordion'],
            contact: ['form', 'simple'],
            footer: ['columns'],
        },
    },
};

/**
 * FNV-1a. Small, dependency-free, and stable across runs and machines -- which matters
 * because the same business asking twice must get the same site back, and a test has to be
 * able to assert what it will get.
 */
function hash(seed: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
}

/**
 * A different draw per facet, so two businesses whose seeds hash close together do not end
 * up with the same five choices. Salting by facet name decorrelates them.
 */
function pick<T>(pool: readonly T[], seed: string, facet: string): T {
    if (pool.length === 0) throw new Error(`art-variety: empty pool for ${facet}`);
    return pool[hash(`${seed}:${facet}`) % pool.length]!;
}

/** Everything that identifies this build, so the draw is stable but not shared. */
export function artSeed(parts: { title?: string; vertical?: string; jobId?: string }): string {
    return [parts.title ?? '', parts.vertical ?? '', parts.jobId ?? ''].join('|').toLowerCase();
}

export function variedArtDirection(styleId: StyleId, seed: string): ArtDirection {
    const palette = PALETTES[styleId];

    return {
        themeId: pick(palette.themes, seed, 'theme'),
        motionId: pick(palette.motions, seed, 'motion'),
        radiusId: pick(palette.radii, seed, 'radius'),
        spacingId: pick(palette.spacings, seed, 'spacing'),
        imageryId: pick(palette.imagery, seed, 'imagery'),
    };
}

export function variedVariants(
    styleId: StyleId,
    seed: string,
): Partial<Record<SectionKey, string>> {
    const palette = PALETTES[styleId];
    const out: Partial<Record<SectionKey, string>> = {};

    for (const [section, pool] of Object.entries(palette.sections)) {
        const key = section as SectionKey;
        const known = VARIANTS[key];
        // A pool entry the renderer does not know would render as the section's default and
        // quietly undo the variety it was added for.
        const usable = known ? pool.filter((v) => known.includes(v)) : [];
        if (usable.length === 0) continue;
        out[key] = pick(usable, seed, `section:${section}`);
    }

    return out;
}

/** The spec as written, with its fixed art and layout replaced by this business's draw. */
export function variedSpec(spec: StyleSpec, seed: string): StyleSpec {
    if (!seed) return spec;

    return {
        ...spec,
        art: variedArtDirection(spec.id, seed),
        variants: { ...spec.variants, ...variedVariants(spec.id, seed) },
    };
}

/** How many distinct sites a tier can produce, for the claim on the pricing page. */
export function paletteSize(styleId: StyleId): number {
    const p = PALETTES[styleId];
    const art = p.themes.length * p.motions.length * p.radii.length * p.spacings.length * p.imagery.length;
    const layout = Object.entries(p.sections).reduce((total, [section, pool]) => {
        const known = VARIANTS[section as SectionKey];
        const usable = known ? pool.filter((v) => known.includes(v)).length : 0;
        return usable > 0 ? total * usable : total;
    }, 1);

    return art * layout;
}
