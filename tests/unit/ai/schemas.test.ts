import { describe, it, expect } from 'vitest';
import {
    categorySchema,
    classification,
    isClassificationShaped,
    generationPlan,
    verticalProfile,
} from '@/lib/contracts/schemas/ai';
import { MAX_SECTIONS } from '@/lib/contracts';

describe('categorySchema — the original ten plus the R2 refresh buckets', () => {
    it('keeps the original ten and adds the seven refresh categories', () => {
        expect([...categorySchema.options].sort()).toEqual([
            // The original frozen ten (kept for back-compat; `other` is the catch-all).
            'agency', 'blog', 'event', 'nonprofit', 'other',
            'portfolio', 'restaurant', 'resume', 'saas', 'store',
            // The seven added when the gallery grew to the mockup's twelve designs.
            'architecture', 'business', 'education', 'fitness', 'food', 'photography', 'travel',
        ].sort());
    });

    it('accepts resume and store', () => {
        expect(categorySchema.safeParse('resume').success).toBe(true);
        expect(categorySchema.safeParse('store').success).toBe(true);
    });

    it('accepts the new refresh categories', () => {
        for (const c of ['fitness', 'food', 'photography', 'architecture', 'education', 'travel', 'business']) {
            expect(categorySchema.safeParse(c).success).toBe(true);
        }
    });

    it('rejects personal and shop', () => {
        expect(categorySchema.safeParse('personal').success).toBe(false);
        expect(categorySchema.safeParse('shop').success).toBe(false);
    });
});

describe('isClassificationShaped', () => {
    const shaped = {
        category: 'x', vertical: 'x', tone: 'x', palette: 'x', sections: [],
    };

    it('accepts an object with all five keys', () => {
        expect(isClassificationShaped(shaped)).toBe(true);
    });

    it('rejects an object missing a key', () => {
        const { sections, ...rest } = shaped;
        void sections;
        expect(isClassificationShaped(rest)).toBe(false);
    });

    it('rejects an unrelated object', () => {
        expect(isClassificationShaped({ nonsense: true })).toBe(false);
    });

    it('rejects null and primitives', () => {
        expect(isClassificationShaped(null)).toBe(false);
        expect(isClassificationShaped('hello')).toBe(false);
    });
});

describe('classification — never rejects on values (FR-024, BR-04)', () => {
    const base = {
        category: 'portfolio',
        vertical: 'photography',
        tone: 'minimal',
        palette: 'dark',
        sections: ['hero'],
    };

    it('accepts a valid classification', () => {
        const out = classification.parse(base);
        expect(out.vertical).toBe('photography');
        expect(out.category).toBe('portfolio');
    });

    it('replaces an invented tone instead of throwing', () => {
        expect(classification.parse({ ...base, tone: 'moody' }).tone).toBe('minimal');
    });

    it('replaces an invented category with other', () => {
        expect(classification.parse({ ...base, category: 'bakery' }).category).toBe('other');
    });

    it('drops an invented section key', () => {
        const out = classification.parse({ ...base, sections: ['hero', 'vibes'] });
        expect(out.sections).not.toContain('vibes');
    });

    it('falls back on a malformed vertical slug', () => {
        expect(classification.parse({ ...base, vertical: 'Not A Slug!' }).vertical)
            .toBe('general-business');
    });

    it('never throws on wrong types in every field', () => {
        expect(() => classification.parse({
            category: 1, vertical: null, tone: [], palette: {}, sections: 'hero',
        })).not.toThrow();
    });
});

describe('generationPlan — strict (FR-043)', () => {
    const s = { type: 'hero', variant: 'split-image', brief: 'welcome the visitor' };

    it('accepts a registered variant', () => {
        expect(generationPlan.safeParse([s]).success).toBe(true);
    });

    it('rejects a variant registered to a different type', () => {
        expect(generationPlan.safeParse([{ ...s, variant: 'masonry' }]).success).toBe(false);
    });

    it('rejects an unregistered variant', () => {
        expect(generationPlan.safeParse([{ ...s, variant: 'spectacular' }]).success).toBe(false);
    });

    it('rejects an unknown section type', () => {
        expect(generationPlan.safeParse([{ ...s, type: 'vibes' }]).success).toBe(false);
    });

    it('rejects an empty plan', () => {
        expect(generationPlan.safeParse([]).success).toBe(false);
    });

    it(`rejects more than ${MAX_SECTIONS} sections`, () => {
        expect(generationPlan.safeParse(Array(MAX_SECTIONS + 1).fill(s)).success).toBe(false);
    });
});

describe('verticalProfile — strict', () => {
    const valid = {
        label: 'Dental clinic',
        aliases: ['dentist'],
        recipe: [
            { type: 'hero', required: true },
            { type: 'services', required: true },
            { type: 'contact', required: true },
        ],
        artDirection: {
            themeId: 'clinical-blue',
            motionId: 'whisper',
            radiusId: 'soft',
            spacingId: 'default',
            imageryId: 'bright-clean',
        },
        vocabulary: { customer: 'patient', purchase: 'appointment' },
        imageQueries: ['dental clinic interior'],
    };

    it('accepts a valid profile', () => {
        expect(verticalProfile.safeParse(valid).success).toBe(true);
    });

    it('rejects an unknown theme', () => {
        const bad = { ...valid, artDirection: { ...valid.artDirection, themeId: 'neon-chaos' } };
        expect(verticalProfile.safeParse(bad).success).toBe(false);
    });

    it('rejects a recipe shorter than three sections', () => {
        expect(verticalProfile.safeParse({ ...valid, recipe: valid.recipe.slice(0, 2) }).success)
            .toBe(false);
    });

    it('rejects an unknown section type in the recipe', () => {
        const bad = { ...valid, recipe: [...valid.recipe, { type: 'vibes', required: false }] };
        expect(verticalProfile.safeParse(bad).success).toBe(false);
    });
});