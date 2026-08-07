import { describe, it, expect } from 'vitest';
import { SECTION_CONTRACTS, contractFor, variantsFor } from '@/lib/ai/sections/contracts';
import { SECTION_KEYS, type SectionKey } from '@/lib/contracts';

const FROZEN_FIELD_TYPES = ['text', 'richtext', 'image', 'color', 'select', 'list'];

describe('section contracts', () => {
    it('every section key has a contract', () => {
        for (const key of SECTION_KEYS) {
            expect(() => contractFor(key)).not.toThrow();
        }
    });

    it('rejects an unknown section type', () => {
        expect(() => contractFor('vibes' as SectionKey)).toThrow(/No content contract/);
    });

    it('every contract has at least one variant', () => {
        for (const c of Object.values(SECTION_CONTRACTS)) {
            expect(c.variants.length).toBeGreaterThan(0);
        }
    });

    it('every field uses the frozen FieldType vocabulary (BR-10)', () => {
        for (const c of Object.values(SECTION_CONTRACTS)) {
            for (const f of c.fields) {
                expect(FROZEN_FIELD_TYPES).toContain(f.type);
            }
        }
    });

    it('the Gemini schema and the prompt field list agree', () => {
        for (const c of Object.values(SECTION_CONTRACTS)) {
            const jsonKeys = Object.keys(c.json.properties ?? {}).sort();
            const listed = c.fieldList.split(', ').filter(Boolean).sort();
            expect(jsonKeys).toEqual(listed);
        }
    });

    it('every field key is unique within a section', () => {
        for (const c of Object.values(SECTION_CONTRACTS)) {
            const keys = c.fields.map((f) => f.key);
            expect(new Set(keys).size).toBe(keys.length);
        }
    });

    it('accepts a valid hero', () => {
        const out = contractFor('hero').fill.safeParse({
            eyebrow: 'Koramangala',
            heading: 'Gentle dentistry for the whole family',
            sub: 'Same-week appointments. Transparent pricing.',
            ctaLabel: 'Book a visit',
            image: { query: 'bright dental clinic reception', alt: 'Clinic reception' },
        });
        expect(out.success).toBe(true);
    });

    it('rejects a hero with a missing field', () => {
        expect(contractFor('hero').fill.safeParse({ heading: 'Hi' }).success).toBe(false);
    });

    it('rejects a heading over its maxLength', () => {
        const out = contractFor('hero').fill.safeParse({
            eyebrow: 'a',
            heading: 'x'.repeat(81),
            sub: 'b',
            ctaLabel: 'Book',
            image: { query: 'q', alt: 'a' },
        });
        expect(out.success).toBe(false);
    });

    it('caps list length', () => {
        const items = Array.from({ length: 20 }, () => ({ title: 'a', body: 'b' }));
        expect(contractFor('services').fill.safeParse({ heading: 'h', items }).success)
            .toBe(false);
    });

    it('requires at least one list item', () => {
        expect(contractFor('services').fill.safeParse({ heading: 'h', items: [] }).success)
            .toBe(false);
    });

    it("variantsFor returns only that type's variants", () => {
        expect(variantsFor('hero')).toContain('split-image');
        expect(variantsFor('hero')).not.toContain('masonry');
        expect(variantsFor('gallery')).toContain('masonry');
    });
});