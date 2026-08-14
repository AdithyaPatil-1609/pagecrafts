import { describe, it, expect } from 'vitest';
import {
    SECTION_CONTRACTS, contractFor, variantsFor, isDummyFact, scrubOptionalFields,
    coerceUngroundedPrices,
} from '@/lib/ai/sections/contracts';
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
        expect(isDummyFact('1-800-555-0123')).toBe(true);
        expect(isDummyFact('(555) 123-4567')).toBe(true);
        expect(isDummyFact('sales@example.com')).toBe(true);
        expect(isDummyFact('sales@inventorytool.com')).toBe(false);
    });

    it('scrubs invented 555 / sales@ emails when the prompt did not give them (D15 v21)', () => {
        const fields = contractFor('contact').fields;
        const prompt = 'landing page for a tool that helps small shops track stock, clean and professional, pricing table';
        const props = scrubOptionalFields({
            heading: 'Get in touch',
            blurb: 'Reach us by email at sales@inventorytool.com or call 1‑800‑555‑0123.',
            address: '',
            phone: '1-800-555-0123',
            email: 'sales@inventorytool.com',
            hours: '',
        }, fields, prompt);
        expect(props.phone).toBe('');
        expect(props.email).toBe('');
        expect(props.blurb).toBe('Get in touch.');
        expect(props.heading).toBe('Get in touch');
    });

    it('keeps a phone and email the description actually gave', () => {
        const fields = contractFor('contact').fields;
        const prompt = 'bakery in pune, call 080 4123 7788 or email hello@risebakery.in';
        const props = scrubOptionalFields({
            heading: 'Find us',
            blurb: 'Call 080 4123 7788 or email hello@risebakery.in',
            address: '',
            phone: '+91 80 4123 7788',
            email: 'hello@risebakery.in',
            hours: '',
        }, fields, prompt);
        expect(props.phone).toBe('+91 80 4123 7788');
        expect(props.email).toBe('hello@risebakery.in');
        expect(props.blurb).toContain('080 4123 7788');
        expect(props.blurb).toContain('hello@risebakery.in');
    });

    it('keeps a 555 number when the prompt itself wrote it', () => {
        const fields = contractFor('contact').fields;
        const props = scrubOptionalFields({
            heading: 'Find us',
            blurb: 'Call 1-800-555-0123',
            address: '',
            phone: '1-800-555-0123',
            email: '',
            hours: '',
        }, fields, 'hotline is 1-800-555-0123');
        expect(props.phone).toBe('1-800-555-0123');
    });

    it('coerces invented menu prices to Varies when the prompt gave no amounts', () => {
        const fields = contractFor('menu').fields;
        const props = {
            heading: 'Plans',
            items: [
                { name: 'Starter', description: 'For one shop', price: '$9/mo' },
                { name: 'Shop', description: 'For a few tills', price: 'Varies' },
            ],
        };
        coerceUngroundedPrices(props, fields, 'landing page for a tool, pricing table');
        expect(props.items[0].price).toBe('Varies');
        expect(props.items[1].price).toBe('Varies');
    });

    it('keeps a price the description actually gave', () => {
        const fields = contractFor('menu').fields;
        const props = {
            heading: 'Menu',
            items: [{ name: 'Idli', description: 'steamed', price: '₹40' }],
        };
        coerceUngroundedPrices(props, fields, 'idli at ₹40, filter coffee');
        expect(props.items[0].price).toBe('₹40');
    });

    it("variantsFor returns only that type's variants", () => {
        expect(variantsFor('hero')).toContain('split-image');
        expect(variantsFor('hero')).not.toContain('masonry');
        expect(variantsFor('gallery')).toContain('masonry');
    });
});