import { Type, type Schema } from '@google/genai';

/** The JSON Schema subset OpenAI-compatible `json_schema` mode accepts. */
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
 * Gemini `Schema` → strict JSON Schema. Strict mode requires every property in
 * `required` and `additionalProperties: false`. `propertyOrdering` is Gemini-only.
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
