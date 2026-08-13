import { describe, it, expect } from 'vitest';
import {
    categorySchema,
    classification,
    coercedFields,
    isClassificationShaped,
    generationPlan,
    verticalProfile,
} from '@/lib/contracts/schemas/ai';
import { MAX_SECTIONS, THEME_IDS, CATEGORY_IDS } from '@/lib/contracts';
import { CATEGORIES } from '@/lib/ai/schemas';

describe('categorySchema — one list, three consumers', () => {
    /**
     * This test used to pin the seventeen buckets the validator happened to have.
     * That is what let it fall behind: the library grew to thirty-eight, the
     * prompt and the provider schema grew with it, and this validator did not —
     * so 21 of 38 categories were accepted by the model and then silently
     * rewritten to "other" by `classification`. The assertion is now the
     * invariant rather than the snapshot.
     */
    it('accepts exactly the buckets the Category type defines', () => {
        expect([...categorySchema.options].sort()).toEqual([...CATEGORY_IDS].sort());
    });

    it('offers the model nothing it will then coerce away', () => {
        // The prompt's list and the provider's response schema both come from
        // CATEGORIES; every one of them must survive the contract validator.
        for (const c of CATEGORIES) {
            expect(categorySchema.safeParse(c).success, c).toBe(true);
        }
    });

    it('accepts the buckets that were being dropped', () => {
        for (const c of ['healthcare', 'beauty', 'real_estate', 'retail', 'personal', 'finance']) {
            expect(categorySchema.safeParse(c).success, c).toBe(true);
        }
    });

    it('still rejects a bucket the library does not have', () => {
        expect(categorySchema.safeParse('shop').success).toBe(false);
        expect(categorySchema.safeParse('').success).toBe(false);
    });

    it('does not flag a valid category as coerced', () => {
        const raw = {
            category: 'healthcare', vertical: 'dental-clinic',
            tone: 'formal', palette: 'light', sections: ['hero'],
        };
        expect(coercedFields(raw)).not.toContain('category');
        expect(classification.parse(raw).category).toBe('healthcare');
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

describe('generationPlan — shape is strict, variant legality is repaired downstream', () => {
    const s = { type: 'hero', variant: 'split-image', brief: 'welcome the visitor' };

    it('accepts a registered variant', () => {
        expect(generationPlan.safeParse([s]).success).toBe(true);
    });

    // normalisePlan repairs an unregistered variant and reports it.
    it('accepts a variant registered to a different type (repaired downstream)', () => {
        expect(generationPlan.safeParse([{ ...s, variant: 'masonry' }]).success).toBe(true);
    });

    it('accepts an unregistered variant (repaired downstream)', () => {
        expect(generationPlan.safeParse([{ ...s, variant: 'spectacular' }]).success).toBe(true);
    });

    it('rejects an empty variant', () => {
        expect(generationPlan.safeParse([{ ...s, variant: '' }]).success).toBe(false);
    });

    // An unknown type is dropped by normalisePlan, not fatal here.
    it('accepts an unknown section type (dropped downstream)', () => {
        expect(generationPlan.safeParse([{ ...s, type: 'vibes' }]).success).toBe(true);
    });

    it('rejects an empty section type', () => {
        expect(generationPlan.safeParse([{ ...s, type: '' }]).success).toBe(false);
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

    // An invented themeId degrades rather than failing the profile.
    it('coerces an unknown theme to the first registered theme', () => {
        const bad = { ...valid, artDirection: { ...valid.artDirection, themeId: 'neon-chaos' } };
        const out = verticalProfile.safeParse(bad);
        expect(out.success).toBe(true);
        expect(out.success && out.data.artDirection.themeId).toBe(THEME_IDS[0]);
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