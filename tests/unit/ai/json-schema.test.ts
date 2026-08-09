import { describe, it, expect } from 'vitest';
import { Type, type Schema } from '@google/genai';
import { toJsonSchema } from '@/lib/ai/gateway/json-schema';
import { planSchema, classifySchema } from '@/lib/ai/gateway/response-schemas';
import { SECTION_CONTRACTS } from '@/lib/ai/sections/contracts';

describe('toJsonSchema', () => {
    it('lowercases Gemini types', () => {
        expect(toJsonSchema({ type: Type.STRING }).type).toBe('string');
        expect(toJsonSchema({ type: Type.ARRAY, items: { type: Type.NUMBER } }).items?.type)
            .toBe('number');
    });

    it('carries enums through — the constraint json_object mode lost', () => {
        const out = toJsonSchema(classifySchema);
        expect(out.properties?.tone.enum).toContain('minimal');
        expect(out.properties?.category.enum).toContain('portfolio');
    });

    it('marks every property required and forbids extras (strict mode)', () => {
        const out = toJsonSchema({
            type: Type.OBJECT,
            properties: { a: { type: Type.STRING }, b: { type: Type.STRING } },
            required: ['a'],
        } as Schema);
        expect(out.required).toEqual(['a', 'b']);
        expect(out.additionalProperties).toBe(false);
    });

    it('drops propertyOrdering, which is Gemini-only', () => {
        expect(toJsonSchema(planSchema)).not.toHaveProperty('propertyOrdering');
        expect(JSON.stringify(toJsonSchema(planSchema))).not.toContain('propertyOrdering');
    });

    it('keeps the section variant enum on the plan schema', () => {
        const items = toJsonSchema(planSchema).properties?.sections.items;
        expect(items?.properties?.variant.enum).toContain('split-image');
        expect(items?.properties?.type.enum).toContain('hero');
    });

    it('converts every section fill schema without throwing', () => {
        for (const contract of Object.values(SECTION_CONTRACTS)) {
            const out = toJsonSchema(contract.json);
            expect(out.type).toBe('object');
            expect(out.additionalProperties).toBe(false);
        }
    });
});
