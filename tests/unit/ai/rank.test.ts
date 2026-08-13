import { describe, expect, it } from 'vitest';
import { rankTemplates, scoreTemplate } from '@/lib/ai/rank';

const templates = [
    { id: 'b', category: 'portfolio' as const, tags: ['dark', 'minimal', 'has-gallery'] },
    { id: 'a', category: 'portfolio' as const, tags: ['dark'] },
    { id: 'c', category: 'restaurant' as const, tags: ['dark', 'minimal', 'has-gallery'] },
];

describe('rankTemplates', () => {
    it('scores category above incidental tag matches', () => {
        expect(scoreTemplate(
            { category: 'portfolio', tone: 'minimal', palette: 'dark', sections: ['gallery'] },
            templates[0],
        )).toBe(51);
    });

    it('an exact vertical match outranks everything else combined (TC-118)', () => {
        const attrs = {
            vertical: 'dental-clinic',
            category: 'restaurant' as const,
            palette: 'dark',
            tone: 'bold',
            sections: ['hero', 'menu'],
        };
        const ranked = rankTemplates(attrs, [
            {
                id: 'a',
                vertical: 'restaurant',
                category: 'restaurant' as const,
                tags: ['dark', 'bold', 'has-hero', 'has-menu'],
            },
            { id: 'b', vertical: 'dental-clinic', category: 'other' as const, tags: [] },
        ]);
        expect(ranked[0].id).toBe('b');
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('ranking is stable across processes (TC-119)', () => {
        const attrs = { category: 'portfolio' as const, palette: 'dark' };
        const once = rankTemplates(attrs, templates).map((t) => t.id);
        const twice = rankTemplates(attrs, [...templates].reverse()).map((t) => t.id);
        expect(twice).toEqual(once);
    });

    it('returns a deterministic order with id tie-breaks', () => {
        const ranked = rankTemplates({ category: 'portfolio', palette: 'dark' }, templates);
        expect(ranked.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    });

    it('does not mutate the input list', () => {
        const before = templates.map((t) => t.id);
        rankTemplates({ category: 'portfolio' }, templates);
        expect(templates.map((t) => t.id)).toEqual(before);
    });
});
