import { Type, type Schema } from '@google/genai';

/**
 * A JSON Schema subset accepted by OpenAI-compatible `response_format:
 * { type: 'json_schema', json_schema: { schema, strict: true } }`.
 */
export interface JsonSchema {
    type: string;
    description?: string;
    enum?: string[];
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
    items?: JsonSchema;
}

const TYPES: Record<string, string> = {
    [Type.STRING]: 'string',
    [Type.NUMBER]: 'number',
    [Type.INTEGER]: 'integer',
    [Type.BOOLEAN]: 'boolean',
    [Type.ARRAY]: 'array',
    [Type.OBJECT]: 'object',
    [Type.NULL]: 'null',
};

/**
 * Convert a Gemini `Schema` into strict JSON Schema.
 *
 * Strict mode requires every declared property to appear in `required` and
 * `additionalProperties: false` on every object, so the constraint Gemini
 * enforced natively is restored on Groq and Cerebras rather than left to Zod.
 * `propertyOrdering` is Gemini-only and is dropped.
 */
export function toJsonSchema(schema: Schema): JsonSchema {
    const type = TYPES[String(schema.type ?? Type.STRING)] ?? 'string';
    const out: JsonSchema = { type };

    if (schema.description) out.description = schema.description;
    if (schema.enum?.length) out.enum = [...schema.enum];

    if (type === 'object') {
        const entries = Object.entries(schema.properties ?? {});
        out.properties = Object.fromEntries(
            entries.map(([key, value]) => [key, toJsonSchema(value as Schema)]),
        );
        out.required = entries.map(([key]) => key);
        out.additionalProperties = false;
    }

    if (type === 'array' && schema.items) {
        out.items = toJsonSchema(schema.items as Schema);
    }

    return out;
}
