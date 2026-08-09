import type { ContentSchema, Field } from "@/lib/contracts";

// The content_schema authoring conventions, as code (C-07).
//
// The content panel is generated from `content_schema` and nothing else — no template ever
// gets its own UI. That promise is only as strong as the schemas: one design that spells a
// field `Heading_1`, or ships a list with no item shape, or leaves a free-text field
// uncapped, forces a special case into the panel, and the first special case is the end of
// "zero per-template UI".
//
// So the conventions are checked rather than agreed. Every rule here is one the panel
// depends on, and the prose behind each — why it exists, and how to author to it — is in
// docs/content-schema-conventions.md. The two are meant to be read together; if this file
// and that document ever disagree, the disagreement is the bug.

const KEY_RE = /^[a-z][a-z0-9_]*$/;

// The section that describes the page as a whole rather than a band of it. It is pinned
// last so the panel opens on the page itself, whatever order the markup puts it in.
const CHROME_SECTION = "site";

function checkField(field: Field, where: string, scope: "section" | "item"): string[] {
    const issues: string[] = [];
    const at = `${where}.${field.key}`;

    if (!KEY_RE.test(field.key)) {
        issues.push(`${at}: key must be lower snake_case (a-z, 0-9, _), named for what is edited`);
    }
    if (!field.label?.trim()) {
        issues.push(`${at}: needs a label — it is what the person reads above the input`);
    }

    // A free-text field with no cap is a layout bug waiting to happen: the design was drawn
    // for a headline, not for an essay.
    if (field.type === "text" && field.maxLength === undefined) {
        issues.push(`${at}: a text field must declare maxLength — the design was drawn for a length`);
    }
    if (field.type !== "text" && field.type !== "richtext" && field.maxLength !== undefined) {
        issues.push(`${at}: maxLength means nothing on a ${field.type} field`);
    }
    if (field.type === "richtext" && field.maxLength !== undefined) {
        issues.push(`${at}: rich text is the long-form field — do not cap it`);
    }

    if (field.type === "select") {
        if (!field.options || field.options.length < 2) {
            issues.push(`${at}: a select needs at least two options, or it is not a choice`);
        }
    } else if (field.options) {
        issues.push(`${at}: options only belong on a select`);
    }

    if (field.type === "list") {
        if (scope === "item") {
            issues.push(`${at}: a list cannot nest inside a list — the panel draws one level`);
        }
        if (!field.itemSchema || field.itemSchema.length === 0) {
            issues.push(`${at}: a list needs an itemSchema — it is the shape of one item`);
        }
        for (const item of field.itemSchema ?? []) {
            issues.push(...checkField(item, at, "item"));
        }
    } else if (field.itemSchema) {
        issues.push(`${at}: itemSchema only belongs on a list`);
    }

    if (scope === "item" && field.type === "richtext") {
        issues.push(`${at}: an item is a card, not a column — use text with a maxLength`);
    }

    return issues;
}

/**
 * Check one schema against the authoring conventions. Returns a list of issues; empty means
 * the schema drives the generated panel with no special cases.
 */
export function checkConventions(schema: ContentSchema): string[] {
    const issues: string[] = [];

    if (schema.sections.length === 0) {
        issues.push("a template needs at least one section");
    }

    const seen = new Set<string>();

    schema.sections.forEach((section, index) => {
        if (!KEY_RE.test(section.key)) {
            issues.push(`${section.key}: section key must be lower snake_case`);
        }
        if (!section.label?.trim()) {
            issues.push(`${section.key}: section needs a label — it titles a group in the panel`);
        }
        if (seen.has(section.key)) {
            issues.push(`${section.key}: duplicate section key`);
        }
        seen.add(section.key);

        if (section.fields.length === 0) {
            issues.push(`${section.key}: a section with no fields is an empty heading in the panel`);
        }

        const keys = new Set<string>();
        for (const field of section.fields) {
            if (keys.has(field.key)) {
                issues.push(`${section.key}.${field.key}: duplicate field key in this section`);
            }
            keys.add(field.key);
            issues.push(...checkField(field, section.key, "section"));
        }

        // Site-wide chrome sits last, so the panel opens on the page and not on the wordmark.
        if (section.key === CHROME_SECTION && index !== schema.sections.length - 1) {
            issues.push(`${CHROME_SECTION}: the site section belongs last`);
        }
    });

    return issues;
}
