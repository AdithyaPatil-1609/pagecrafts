import { describe, expect, it } from 'vitest';
import { parseComposition } from '@/lib/editor/parse-composition';

describe('parseComposition', () => {
    it('returns null for empty or invalid JSON', () => {
        expect(parseComposition(null)).toBeNull();
        expect(parseComposition('')).toBeNull();
        expect(parseComposition('{')).toBeNull();
        expect(parseComposition('[]')).toBeNull();
    });

    it('keeps valid sections and drops unknown types', () => {
        const parsed = parseComposition(JSON.stringify({
            schemaVersion: 3,
            vertical: 'dental-clinic',
            artDirection: {
                themeId: 'calm-sage',
                motionId: 'whisper',
                radiusId: 'soft',
                spacingId: 'airy',
                imageryId: 'warm-natural',
            },
            meta: { title: 'Smile', description: 'Family dentistry', lang: 'en' },
            sections: [
                { id: 's1', type: 'hero', variant: 'centred', props: { heading: 'Hi' } },
                { id: 'bad', type: 'not-real', variant: 'x', props: {} },
            ],
        }));

        expect(parsed?.meta.title).toBe('Smile');
        expect(parsed?.artDirection.themeId).toBe('calm-sage');
        expect(parsed?.sections).toHaveLength(1);
        expect(parsed?.sections[0].id).toBe('s1');
        expect(parsed?.sections[0].visible).toBe(true);
    });
});
