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