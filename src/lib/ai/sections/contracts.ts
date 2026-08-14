import { z } from 'zod';
import { Type, type Schema } from '@google/genai';
import type { Field, SectionKey } from '@/lib/contracts';

export interface SectionContract {
    type: SectionKey;
    label: string;
    variants: string[];
    fields: Field[];
    fill: z.ZodTypeAny;
    json: Schema;
    fieldList: string;
}

const MODEL_FILLABLE: ReadonlySet<Field['type']> = new Set([
    'text', 'richtext', 'image', 'select', 'list',
]);

function textZod(f: Field, fallbackMax: number): z.ZodTypeAny {
    const max = f.maxLength ?? fallbackMax;
    // Optional facts (phone, email) may be "". min(1) is what forced
    // "Not listed" / "XXXXXXXXXX" and then failed the human sheet.
    return f.optional ? z.string().max(max) : z.string().min(1).max(max);
}

function zodForField(f: Field): z.ZodTypeAny {
    switch (f.type) {
        case 'text': return textZod(f, 120);
        case 'richtext': return textZod(f, 900);
        case 'image': return z.object({
            query: z.string().min(1).max(80),
            alt: z.string().min(1).max(120),
        });
        case 'select': return z.enum((f.options ?? ['default']) as [string, ...string[]]);
        case 'list': return z.array(zodForFields(f.itemSchema ?? []))
            .min(1).max(f.maxLength ?? 8);
        case 'color': throw new Error(`Field "${f.key}": colour is never model-filled.`);
        default: {
            const exhaustive: never = f.type;
            return exhaustive;
        }
    }
}

function zodForFields(fields: Field[]) {
    return z.object(Object.fromEntries(
        fields.filter((f) => MODEL_FILLABLE.has(f.type)).map((f) => [f.key, zodForField(f)]),
    ));
}

function jsonForField(f: Field): Schema {
    switch (f.type) {
        case 'text':
        case 'richtext': return { type: Type.STRING };
        case 'image': return {
            type: Type.OBJECT,
            properties: { query: { type: Type.STRING }, alt: { type: Type.STRING } },
            required: ['query', 'alt'],
            propertyOrdering: ['query', 'alt'],
        };
        case 'select': return { type: Type.STRING, enum: f.options ?? [] };
        case 'list': return { type: Type.ARRAY, items: jsonForFields(f.itemSchema ?? []) };
        case 'color': throw new Error(`Field "${f.key}": colour is never model-filled.`);
        default: {
            const exhaustive: never = f.type;
            return exhaustive;
        }
    }
}

function jsonForFields(fields: Field[]): Schema {
    const usable = fields.filter((f) => MODEL_FILLABLE.has(f.type));
    // Keys stay in `required` even when optional: Groq json_schema strict
    // rejects missing properties. Optional means the string may be "".
    return {
        type: Type.OBJECT,
        properties: Object.fromEntries(usable.map((f) => [f.key, jsonForField(f)])),
        required: usable.map((f) => f.key),
        propertyOrdering: usable.map((f) => f.key),
    };
}

function define(
    type: SectionKey, label: string, variants: string[], fields: Field[],
): SectionContract {
    const usable = fields.filter((f) => MODEL_FILLABLE.has(f.type));
    return {
        type, label, variants, fields,
        fill: zodForFields(fields),
        json: jsonForFields(fields),
        fieldList: usable.map((f) => f.key).join(', '),
    };
}

const t = (key: string, label: string, maxLength?: number, optional = false): Field =>
    ({ key, label, type: 'text', ...(maxLength ? { maxLength } : {}), ...(optional ? { optional } : {}) });
const rt = (key: string, label: string, maxLength?: number, optional = false): Field =>
    ({ key, label, type: 'richtext', ...(maxLength ? { maxLength } : {}), ...(optional ? { optional } : {}) });
const img = (key: string, label: string): Field => ({ key, label, type: 'image' });
const list = (key: string, label: string, itemSchema: Field[], maxLength: number): Field =>
    ({ key, label, type: 'list', itemSchema, maxLength });

export const SECTION_CONTRACTS: Record<SectionKey, SectionContract> = {
    hero: define('hero', 'Hero', ['centred', 'split-image', 'image-bg', 'minimal'], [
        t('eyebrow', 'Eyebrow', 60),
        t('heading', 'Heading', 80),
        rt('sub', 'Subheading', 200),
        t('ctaLabel', 'Button label', 40),
        img('image', 'Image'),
    ]),
    about: define('about', 'About', ['text', 'media-split'], [
        t('heading', 'Heading'), rt('body', 'Body', 900), img('image', 'Image'),
    ]),
    services: define('services', 'Services', ['cards', 'grid', 'timeline'], [
        t('heading', 'Heading'),
        list('items', 'Items', [t('title', 'Title', 60), rt('body', 'Description', 240)], 8),
    ]),
    menu: define('menu', 'Menu', ['grouped', 'simple'], [
        t('heading', 'Heading'),
        list('items', 'Items', [
            t('name', 'Name', 60), rt('description', 'Description', 160), t('price', 'Price', 20),
        ], 20),
    ]),
    gallery: define('gallery', 'Gallery', ['masonry', 'grid', 'carousel'], [
        t('heading', 'Heading'),
        list('images', 'Images', [t('query', 'Search', 80), t('alt', 'Description', 120)], 12),
    ]),
    team: define('team', 'Team', ['cards', 'grid'], [
        t('heading', 'Heading'),
        list('members', 'Members', [
            t('name', 'Name', 60), t('role', 'Role', 60), rt('bio', 'Bio', 240),
        ], 8),
    ]),
    testimonials: define('testimonials', 'Testimonials', ['quotes', 'cards'], [
        t('heading', 'Heading'),
        list('items', 'Quotes', [rt('quote', 'Quote', 300), t('author', 'Name', 60)], 6),
    ]),
    faq: define('faq', 'FAQ', ['accordion', 'two-column'], [
        t('heading', 'Heading'),
        list('items', 'Questions', [
            t('question', 'Question', 140), rt('answer', 'Answer', 500),
        ], 10),
    ]),
    contact: define('contact', 'Contact', ['split-map', 'simple', 'form'], [
        t('heading', 'Heading'), rt('blurb', 'Intro', 240),
        t('address', 'Address', 200, true), t('phone', 'Phone', 40, true),
        t('email', 'Email', 80, true), t('hours', 'Opening hours', 200, true),
    ]),
    footer: define('footer', 'Footer', ['simple', 'columns'], [
        t('tagline', 'Tagline', 120),
    ]),
};

export function contractFor(type: SectionKey): SectionContract {
    const c = SECTION_CONTRACTS[type];
    if (!c) throw new Error(`No content contract for section type "${type}".`);
    return c;
}

export function variantsFor(type: SectionKey): string[] {
    return contractFor(type).variants;
}

/**
 * Dummy labels the model writes when it is not allowed to invent a fact and
 * used to be forbidden from returning "". Empty is now legal on optional
 * fields; these strings are not a phone number.
 */
export function isDummyFact(value: string): boolean {
    const t = value.trim();
    if (!t) return true;
    if (/^\[.*]$/.test(t)) return true;
    if (/^(n\/?a|none|not (listed|provided|available)|pending|on request|tbd)$/i.test(t)) {
        return true;
    }
    if (/^(phone number|office address|studio address|your name)$/i.test(t)) return true;
    if (/^add .{0,60} here\.?$/i.test(t)) return true;
    const compact = t.replace(/[\s\-().+]/g, '');
    return /^(?:\+?\d*)?x{6,}$/i.test(compact);
}

/** Mutates `props` in place: optional text facts that are dummy become "". */
export function scrubOptionalFields(
    props: Record<string, unknown>,
    fields: Field[],
): Record<string, unknown> {
    for (const f of fields) {
        if (!f.optional || (f.type !== 'text' && f.type !== 'richtext')) continue;
        const v = props[f.key];
        if (typeof v === 'string' && isDummyFact(v)) props[f.key] = '';
    }
    return props;
}

/** The variant menu, generated from the registry so the prompt can never drift from it. */
export function variantMenu(): string {
    return Object.values(SECTION_CONTRACTS)
        .map((c) => `${c.type.padEnd(12)} ${c.variants.join(' | ')}`)
        .join('\n');
}