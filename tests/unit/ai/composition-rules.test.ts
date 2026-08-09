import { describe, it, expect } from 'vitest';
import { normalisePlan, type NormalisedPlan } from '@/lib/ai/composition/rules';
import { MAX_SECTIONS } from '@/lib/contracts';

const show = (p: NormalisedPlan) => p.sections.map((s) => `${s.type}/${s.variant}`);

describe('normalisePlan', () => {
    it('repairs a section whose variant is not registered, and reports it', () => {
        const out = normalisePlan([
            { type: 'hero', variant: 'centred', brief: 'a' },
            { type: 'about', variant: 'parallax', brief: 'b' },
        ]);
        expect(show(out)).toEqual(['hero/centred', 'about/text']);
        expect(out.repairs).toHaveLength(1);
        expect(out.repairs[0]).toContain('parallax');
    });

    // D10 / B1a — an unknown section type is dropped and reported, not fatal.
    it('drops an unknown section type and reports it', () => {
        const out = normalisePlan([
            { type: 'hero', variant: 'centred', brief: 'a' },
            { type: 'vibes', variant: 'whatever', brief: 'b' },
            { type: 'footer', variant: 'columns', brief: 'c' },
        ]);
        expect(show(out)).toEqual(['hero/centred', 'footer/columns']);
        expect(out.repairs.some((r) => r.includes('vibes'))).toBe(true);
    });

    it('keeps hero first and footer last', () => {
        const out = normalisePlan([
            { type: 'footer', variant: 'columns', brief: 'd' },
            { type: 'about', variant: 'text', brief: 'b' },
            { type: 'hero', variant: 'centred', brief: 'a' },
        ]);
        expect(show(out)).toEqual(['hero/centred', 'about/text', 'footer/columns']);
    });

    it('rewrites a repeated variant on the later section', () => {
        const out = normalisePlan([
            { type: 'services', variant: 'cards', brief: 'a' },
            { type: 'team', variant: 'cards', brief: 'b' },
        ]);
        expect(show(out)).toEqual(['services/cards', 'team/grid']);
    });

    it('catches a footer repeating the last middle section', () => {
        const out = normalisePlan([
            { type: 'hero', variant: 'centred', brief: 'a' },
            { type: 'about', variant: 'text', brief: 'b' },
            { type: 'contact', variant: 'simple', brief: 'c' },
            { type: 'footer', variant: 'simple', brief: 'd' },
        ]);
        expect(show(out)).toEqual([
            'hero/centred', 'about/text', 'contact/simple', 'footer/columns',
        ]);
    });

    it('removes adjacent duplicates before the cap, not after', () => {
        const out = normalisePlan([
            { type: 'hero', variant: 'centred', brief: 'a' },
            { type: 'about', variant: 'text', brief: 'b' },
            { type: 'about', variant: 'text', brief: 'b-dupe' },
            { type: 'services', variant: 'cards', brief: 'c' },
            { type: 'team', variant: 'grid', brief: 'd' },
            { type: 'testimonials', variant: 'quotes', brief: 'e' },
            { type: 'gallery', variant: 'masonry', brief: 'f' },
            { type: 'menu', variant: 'grouped', brief: 'g' },
            { type: 'faq', variant: 'accordion', brief: 'h' },
            { type: 'footer', variant: 'columns', brief: 'i' },
        ]);
        expect(out.sections).toHaveLength(MAX_SECTIONS);
        expect(show(out)).toEqual([
            'hero/centred', 'about/text', 'services/cards', 'team/grid',
            'testimonials/quotes', 'gallery/masonry', 'footer/columns',
        ]);
    });

    it('handles a plan with no hero and no footer', () => {
        const out = normalisePlan([
            { type: 'about', variant: 'text', brief: 'a' },
            { type: 'contact', variant: 'form', brief: 'b' },
        ]);
        expect(show(out)).toEqual(['about/text', 'contact/form']);
    });

    it('returns an empty plan unchanged', () => {
        expect(normalisePlan([])).toEqual({ sections: [], repairs: [] });
    });
});
