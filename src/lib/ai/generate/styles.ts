import type { ArtDirection, Composition, SectionKey } from '@/lib/contracts';

/** Stable ids for entitlements / choose API. Labels are Starter / Pro / Premium. */
export const STYLE_IDS = ['casual', 'photos', 'motion'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_TIERS = ['free', 'pro', 'premium'] as const;
export type StyleTier = (typeof STYLE_TIERS)[number];

export interface StyleSpec {
    id: StyleId;
    label: string;
    blurb: string;
    tier: StyleTier;
    priceInr: number;
    art: ArtDirection;
    variants: Partial<Record<SectionKey, string>>;
    photos: boolean | 'hero';
}

/**
 * Three looks from one brief.
 *
 * Starter (casual): sidebar + simple image background, free.
 * Pro (photos): blended top bar, separate pages, photo-rich, ₹499.
 * Premium (motion): liquid PageCrafts-like deck, continuous scroll — not broken kinetic blobs, ₹999.
 */
export const STYLE_SPECS: Record<StyleId, StyleSpec> = {
    casual: {
        id: 'casual',
        label: 'Starter',
        blurb: 'Sidebar with every page and a simple image hero — clear and free.',
        tier: 'free',
        priceInr: 0,
        art: {
            themeId: 'sunlit-craft',
            motionId: 'none',
            radiusId: 'soft',
            spacingId: 'default',
            imageryId: 'bright-clean',
        },
        variants: {
            hero: 'split-image',
            about: 'text',
            services: 'cards',
            menu: 'simple',
            contact: 'simple',
            footer: 'simple',
        },
        photos: 'hero',
    },
    photos: {
        id: 'photos',
        label: 'Pro',
        blurb: 'Photo-rich cinematic hero, blended top bar, and separate pages.',
        tier: 'pro',
        priceInr: 499,
        art: {
            themeId: 'warm-editorial',
            motionId: 'editorial',
            radiusId: 'organic',
            spacingId: 'airy',
            imageryId: 'warm-natural',
        },
        variants: {
            hero: 'image-bg',
            about: 'media-split',
            services: 'cards',
            menu: 'grouped',
            gallery: 'masonry',
            contact: 'split-map',
            footer: 'columns',
        },
        photos: true,
    },
    motion: {
        id: 'motion',
        label: 'Premium',
        blurb: 'Liquid PageCrafts-like deck — blooms, display type, continuous scroll.',
        tier: 'premium',
        priceInr: 999,
        art: {
            themeId: 'deep-luxury',
            motionId: 'calm',
            radiusId: 'soft',
            spacingId: 'airy',
            imageryId: 'bold-contrast',
        },
        variants: {
            hero: 'centred',
            about: 'text',
            services: 'cards',
            faq: 'accordion',
            contact: 'form',
            footer: 'columns',
        },
        // 'hero', not false. False meant the premium tier never fetched a photograph at
        // all, so it sold a glowing SVG while the free tier showed a real room. The hero
        // photo is the whole composition now; the rest of the page stays type and motion,
        // which is what separates this from Photo-rich.
        photos: 'hero',
    },
};

export function cloneComposition(composition: Composition): Composition {
    return structuredClone(composition);
}

export function applyStyle(composition: Composition, spec: StyleSpec): Composition {
    const next = cloneComposition(composition);
    next.artDirection = spec.art;
    next.sections = next.sections.map((section) => ({
        ...section,
        variant: spec.variants[section.type] ?? section.variant,
    }));
    return next;
}
