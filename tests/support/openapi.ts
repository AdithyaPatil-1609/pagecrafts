import { readFileSync } from "node:fs";
import { join } from "node:path";

import { load } from "js-yaml";

export interface OpenApiDocument {
    paths: Record<string, Record<string, OperationObject>>;
    components: { schemas: Record<string, Schema>; responses: Record<string, unknown> };
}

interface OperationObject {
    operationId?: string;
    responses: Record<string, { content?: Record<string, { schema: Schema }> }>;
    requestBody?: { content: Record<string, { schema: Schema }> };
}

export interface Schema {
    $ref?: string;
    allOf?: Schema[];
    type?: string | string[];
    enum?: unknown[];
    const?: unknown;
    pattern?: string;
    required?: string[];
    properties?: Record<string, Schema>;
    additionalProperties?: boolean | Schema;
    items?: Schema;
    minItems?: number;
    maxItems?: number;
    minLength?: number;
    maxLength?: number;
    format?: string;
    description?: string;
}

const SPEC_PATH = join(process.cwd(), "docs", "openapi.yaml");

export const spec = load(readFileSync(SPEC_PATH, "utf8")) as OpenApiDocument;

/** The response schema the spec declares for one operation and status code. */
export function responseSchema(path: string, method: string, status: number | string): Schema {
    const operation = spec.paths[path]?.[method.toLowerCase()];
    if (!operation) throw new Error(`openapi.yaml documents no ${method} ${path}`);

    const response =
        operation.responses[String(status)] ??
        // Every operation declares `default: Error` for the failure envelope.
        (operation.responses.default as { $ref?: string } | undefined);

    if (!response) {
        throw new Error(`openapi.yaml documents no ${status} response for ${method} ${path}`);
    }

    // `default` is a $ref to components.responses.Error rather than an inline schema.
    if ("$ref" in response && typeof response.$ref === "string") {
        return { $ref: "#/components/schemas/ErrorResult" };
    }

    const schema = (response as { content?: Record<string, { schema: Schema }> }).content?.[
        "application/json"
    ]?.schema;

    if (!schema) {
        throw new Error(`${method} ${path} ${status} declares no application/json schema`);
    }

    return schema;
}

function deref(schema: Schema): Schema {
    if (!schema.$ref) return schema;

    const name = schema.$ref.replace("#/components/schemas/", "");
    const target = spec.components.schemas[name];
    if (!target) throw new Error(`unresolved $ref: ${schema.$ref}`);

    return deref(target);
}

function resolve(schema: Schema): Schema {
    const base = deref(schema);
    if (!base.allOf) return base;

    const merged: Schema = { ...base, allOf: undefined, required: [], properties: {} };
    delete merged.allOf;

    for (const part of [...base.allOf, { ...base, allOf: undefined }]) {
        const resolved = resolve(part as Schema);
        merged.type ??= resolved.type;
        merged.required = [...(merged.required ?? []), ...(resolved.required ?? [])];
        merged.properties = { ...merged.properties, ...resolved.properties };
        if (resolved.additionalProperties !== undefined) {
            merged.additionalProperties = resolved.additionalProperties;
        }
    }

    return merged;
}

function typeMatches(type: string, value: unknown): boolean {
    switch (type) {
        case "object":
            return typeof value === "object" && value !== null && !Array.isArray(value);
        case "array":
            return Array.isArray(value);
        case "string":
            return typeof value === "string";
        case "boolean":
            return typeof value === "boolean";
        case "number":
            return typeof value === "number";
        case "integer":
            return typeof value === "number" && Number.isInteger(value);
        case "null":
            return value === null;
        default:
            return false;
    }
}

const KNOWN_KEYWORDS = new Set([
    "$ref", "allOf", "type", "enum", "const", "pattern", "required", "properties",
    "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength",
    "format", "description",
]);

function check(schema: Schema, value: unknown, at: string, issues: string[]): void {
    const s = resolve(schema);

    for (const keyword of Object.keys(s)) {
        if (!KNOWN_KEYWORDS.has(keyword)) {
            issues.push(`${at}: the spec uses "${keyword}", which this checker does not implement`);
        }
    }

    if (s.const !== undefined && value !== s.const) {
        issues.push(`${at}: expected ${JSON.stringify(s.const)}, got ${JSON.stringify(value)}`);
        return;
    }

    if (s.enum && !s.enum.includes(value as never)) {
        issues.push(`${at}: ${JSON.stringify(value)} is not one of ${s.enum.join(", ")}`);
        return;
    }

    if (s.type) {
        const types = Array.isArray(s.type) ? s.type : [s.type];
        if (!types.some((type) => typeMatches(type, value))) {
            issues.push(`${at}: expected ${types.join(" | ")}, got ${JSON.stringify(value)}`);
            return;
        }
    }

    if (typeof value === "string") {
        if (s.pattern && !new RegExp(s.pattern).test(value)) {
            issues.push(`${at}: "${value}" does not match ${s.pattern}`);
        }
        if (s.minLength !== undefined && value.length < s.minLength) {
            issues.push(`${at}: shorter than minLength ${s.minLength}`);
        }
        if (s.maxLength !== undefined && value.length > s.maxLength) {
            issues.push(`${at}: longer than maxLength ${s.maxLength}`);
        }
    }

    if (Array.isArray(value)) {
        if (s.minItems !== undefined && value.length < s.minItems) {
            issues.push(`${at}: fewer than minItems ${s.minItems}`);
        }
        if (s.maxItems !== undefined && value.length > s.maxItems) {
            issues.push(`${at}: more than maxItems ${s.maxItems}`);
        }
        if (s.items) {
            value.forEach((item, index) => check(s.items!, item, `${at}[${index}]`, issues));
        }
        return;
    }

    if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;

        for (const key of s.required ?? []) {
            if (!(key in record)) issues.push(`${at}: missing required property "${key}"`);
        }

        for (const [key, entry] of Object.entries(record)) {
            const property = s.properties?.[key];
            if (property) {
                check(property, entry, `${at}.${key}`, issues);
                continue;
            }
            // An undocumented property is a real finding: it is something a route returns
            // that no integrator has been told about.
            if (s.additionalProperties === undefined || s.additionalProperties === false) {
                if (s.properties) issues.push(`${at}: "${key}" is not in the spec`);
                continue;
            }
            if (typeof s.additionalProperties === "object") {
                check(s.additionalProperties, entry, `${at}.${key}`, issues);
            }
        }
    }
}

/** Returns a list of ways `value` departs from the schema; empty means it conforms. */
export function validate(schema: Schema, value: unknown, at = "body"): string[] {
    const issues: string[] = [];
    check(schema, value, at, issues);
    return issues;
}
