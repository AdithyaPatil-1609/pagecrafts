import type { ArtDirection, Composition, SectionKey } from '@/lib/contracts';

export const STYLE_IDS = ['casual', 'photos', 'motion'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

/** Planned product plans — not charged yet, but each look is born into one. */
export const STYLE_TIERS = ['free', 'pro', 'premium'] as const;
export type StyleTier = (typeof STYLE_TIERS)[number];

export interface StyleSpec {
    id: StyleId;
    label: string;
    blurb: string;
    tier: StyleTier;
    priceInr: number;
    art: ArtDirection;
    /** Layout variant overrides, applied when that section exists. */
    variants: Partial<Record<SectionKey, string>>;
    /** Stamp real photographs into image slots. */
    photos: boolean;
}

/**
 * Three looks from one brief.
 *
 * Casual is the free default: a clean page with no photographs and no motion.
 * Photos is the Pro look: full-bleed imagery. Motion is Premium: colour and
 * scroll animation. Same words, three different sites — so a sweet shop is not
 * one generic page, it is a choice.
 */
export const STYLE_SPECS: Record<StyleId, StyleSpec> = {
    casual: {
        id: 'casual',
        label: 'Casual',
        blurb: 'Clean and simple. Words first, no photographs, no animation.',
        tier: 'free',
        priceInr: 0,
        art: {
            themeId: 'mono-precision',
            motionId: 'none',
            radiusId: 'soft',
            spacingId: 'default',
            imageryId: 'bright-clean',
        },
        variants: {
            hero: 'centred',
            about: 'text',
            services: 'cards',
            menu: 'simple',
            contact: 'simple',
            footer: 'simple',
        },
        photos: false,
    },
    photos: {
        id: 'photos',
        label: 'Photo-rich',
        blurb: 'A cinematic hero and real photographs throughout the page.',
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
        label: 'Animated',
        blurb: 'A kinetic canvas — oversized type, glow, and motion drawn from this business, not generic blobs.',
        tier: 'premium',
        priceInr: 999,
        art: {
            themeId: 'vivid-energy',
            motionId: 'kinetic',
            radiusId: 'pill',
            spacingId: 'tight',
            imageryId: 'bold-contrast',
        },
        variants: {
            hero: 'centred',
            about: 'text',
            services: 'timeline',
            faq: 'accordion',
            contact: 'form',
            footer: 'columns',
        },
        photos: false,
    },
};

export function cloneComposition(composition: Composition): Composition {
    return structuredClone(composition);
}

/** Restyle a composition into one of the three looks. Copy stays the same. */
export function applyStyle(composition: Composition, spec: StyleSpec): Composition {
    const next = cloneComposition(composition);
    next.artDirection = spec.art;
    next.sections = next.sections.map((section) => ({
        ...section,
        variant: spec.variants[section.type] ?? section.variant,
    }));
    return next;
}
