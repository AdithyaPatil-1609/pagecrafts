import { describe, expect, it } from 'vitest';

import { applyStyle, STYLE_SPECS, STYLE_IDS } from '@/lib/ai/generate/styles';
import { buildStyleOptions } from '@/lib/ai/generate/options';
import {
    bankPhotoUrl,
    CLOTHING_PHOTO_ID,
    DESSERT_PHOTO_ID,
    MITHAI_SEARCH,
    photoSearchQuery,
    stampPhotoUrls,
} from '@/lib/ai/generate/photos';
import { SCHEMA_VERSION, type ArtDirection, type Composition, type SectionInstance } from '@/lib/contracts';

const ART: ArtDirection = {
    themeId: 'calm-sage', motionId: 'whisper', radiusId: 'soft',
    spacingId: 'airy', imageryId: 'warm-natural',
};

const section = (
    id: string,
    type: SectionInstance['type'],
    variant: string,
    props: Record<string, unknown>,
): SectionInstance => ({
    id, type, variant, brief: 'b', visible: true, locked: false, source: 'ai', props,
});

const composition: Composition = {
    schemaVersion: SCHEMA_VERSION,
    vertical: 'sweet-shop',
    artDirection: ART,
    meta: { title: 'Mithas Sweets', description: 'A sweet shop in Old Delhi', lang: 'en' },
    sections: [
        section('s_01', 'hero', 'split-image', {
            heading: 'Mithas Sweets',
            image: { query: 'indian sweets mithai', alt: 'Trays of mithai' },
        }),
        section('s_02', 'about', 'text', { heading: 'About', body: 'Family recipes.' }),
        section('s_03', 'menu', 'simple', {
            heading: 'What we make',
            items: [{ name: 'Laddu', description: 'Besan.', price: 'Varies' }],
        }),
        section('s_04', 'contact', 'simple', { heading: 'Visit', blurb: 'Chandni Chowk.' }),
        section('s_05', 'footer', 'simple', { tagline: 'Mithas Sweets' }),
    ],
};

describe('style presets — three looks from one brief', () => {
    it('ships casual, photo-rich and animated', () => {
        expect(STYLE_IDS).toEqual(['casual', 'photos', 'motion']);
        expect(STYLE_SPECS.casual.tier).toBe('free');
        expect(STYLE_SPECS.photos.tier).toBe('pro');
        expect(STYLE_SPECS.motion.tier).toBe('premium');
    });

    it('keeps the copy and changes the look', () => {
        const photos = applyStyle(composition, STYLE_SPECS.photos);
        expect(photos.sections.find((s) => s.type === 'hero')?.props.heading).toBe('Mithas Sweets');
        expect(photos.artDirection.themeId).not.toBe(STYLE_SPECS.casual.art.themeId);
        expect(photos.artDirection.motionId).not.toBe(STYLE_SPECS.motion.art.motionId);
        expect(photos.sections.find((s) => s.type === 'hero')?.variant).toBe('image-bg');
        expect(applyStyle(composition, STYLE_SPECS.casual).sections.find((s) => s.type === 'hero')?.variant)
            .toBe('centred');
        expect(applyStyle(composition, STYLE_SPECS.motion).artDirection.motionId).toBe('kinetic');
    });

    it('picks a mithai photograph for a sweets query', () => {
        expect(bankPhotoUrl('indian sweets mithai')).toContain(DESSERT_PHOTO_ID);
        expect(bankPhotoUrl('indian sweets mithai')).not.toBe(bankPhotoUrl('a gym in koramangala'));
    });

    it('does not use a clothing shop photo for a sweet shop, even if the slot says shop interior', async () => {
        const shoppy = {
            ...composition,
            sections: composition.sections.map((section) =>
                section.type === 'hero'
                    ? { ...section, props: { ...section.props, image: { query: 'shop interior', alt: 'Store' } } }
                    : section,
            ),
        };
        const search = photoSearchQuery(shoppy.vertical, shoppy.meta.title, 'shop interior');
        expect(search).toBe(MITHAI_SEARCH);
        expect(bankPhotoUrl(search)).toContain(DESSERT_PHOTO_ID);
        expect(bankPhotoUrl(search)).not.toContain(CLOTHING_PHOTO_ID);

        const stamped = await stampPhotoUrls(shoppy);
        const heroImage = stamped.sections.find((section) => section.type === 'hero')?.props.image as { url?: string };
        expect(heroImage.url).toContain(DESSERT_PHOTO_ID);
        expect(heroImage.url).not.toContain(CLOTHING_PHOTO_ID);

        expect(bankPhotoUrl('saree boutique dresses')).toContain(CLOTHING_PHOTO_ID);
    });

    it('builds three finished sites, and only the photo look has pictures', async () => {
        const options = await buildStyleOptions(composition);
        expect(options.map((o) => o.id)).toEqual(['casual', 'photos', 'motion']);

        const html = Object.fromEntries(options.map((o) => [o.id, o.files['index.html'] ?? '']));
        expect(html.casual).toContain('data-style="casual"');
        expect(html.photos).toContain('data-style="photos"');
        expect(html.motion).toContain('data-style="motion"');

        expect(html.casual).not.toContain('images.unsplash.com');
        expect(html.photos).toContain('images.unsplash.com');
        expect(html.photos).toContain('<img src="');
        expect(html.casual).toContain('data-motion="none"');
        expect(html.photos).toContain('data-motion="editorial"');
        expect(html.motion).toContain('data-motion="kinetic"');
        expect(html.motion).toContain('data-motif="jalebi"');
        expect(html.motion).toContain('jalebi-coil');
        expect(html.motion).toContain('honey-drip');
        expect(html.motion).toContain('motion-stage');
        expect(html.motion).toContain('motion-ticker');
        expect(html.motion).toContain('--bg: #06040c');
        expect(html.motion).not.toContain('pc-orb');
        expect(html.casual).not.toContain('data-motif="jalebi"');
        expect(html.casual).not.toContain('motion-stage');
        expect(html.photos).not.toContain('data-motif="jalebi"');
        expect(html.photos).not.toContain('motion-stage');
        expect(html.motion).toContain('pc-pulse 1.4s ease-in-out infinite');
        expect(html.casual).toContain('Mithas Sweets');
        expect(html.photos).toContain('Mithas Sweets');
        expect(html.motion).toContain('Mithas Sweets');
    });
});
