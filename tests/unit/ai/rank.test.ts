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

    it('puts an exact vertical above a broad category match', () => {
        const exact = {
            id: 'dental',
            vertical: 'dental-clinic',
            category: 'healthcare' as const,
            tags: ['calm'],
        };
        const broad = {
            id: 'medical',
            category: 'healthcare' as const,
            tags: ['calm', 'minimal', 'has-gallery'],
        };

        const ranked = rankTemplates({
            vertical: 'dental-clinic',
            category: 'healthcare',
            tone: 'minimal',
            sections: ['gallery'],
        }, [broad, exact]);

        expect(ranked.map((template) => template.id)).toEqual(['dental', 'medical']);
        expect(ranked[0].score).toBe(130);
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