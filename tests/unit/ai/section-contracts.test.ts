import { describe, it, expect } from 'vitest';
import { SECTION_CONTRACTS, contractFor, variantsFor, isDummyFact, scrubOptionalFields } from '@/lib/ai/sections/contracts';
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

    it('accepts empty contact facts — a missing phone is not a blank page', () => {
        const out = contractFor('contact').fill.safeParse({
            heading: 'Find us',
            blurb: 'Call if you have the number.',
            address: '',
            phone: '',
            email: '',
            hours: '',
        });
        expect(out.success).toBe(true);
    });

    it('still rejects an empty contact heading', () => {
        expect(contractFor('contact').fill.safeParse({
            heading: '',
            blurb: 'Hi',
            address: '',
            phone: '',
            email: '',
            hours: '',
        }).success).toBe(false);
    });

    it('scrubs dummy contact labels to empty', () => {
        const fields = contractFor('contact').fields;
        const props = scrubOptionalFields({
            heading: 'Find us',
            blurb: 'Visit.',
            address: 'Office address',
            phone: '+91-XXXXXXXXXX',
            email: 'Not listed',
            hours: 'pending',
        }, fields);
        expect(props.address).toBe('');
        expect(props.phone).toBe('');
        expect(props.email).toBe('');
        expect(props.hours).toBe('');
        expect(props.heading).toBe('Find us');
        expect(isDummyFact('Not provided')).toBe(true);
        expect(isDummyFact('Add phone number here')).toBe(true);
        expect(isDummyFact('Add email address here')).toBe(true);
        expect(isDummyFact('080 1234')).toBe(false);
    });

    it("variantsFor returns only that type's variants", () => {
        expect(variantsFor('hero')).toContain('split-image');
        expect(variantsFor('hero')).not.toContain('masonry');
        expect(variantsFor('gallery')).toContain('masonry');
    });
});