import type { ContentOp, ContentSchema, Field } from "@/lib/contracts";

// The content panel's write path (E-1). Ops address slots by dotted path — "hero.headline"
// is the `headline` field of the `hero` section; a list field is set whole, as an array of
// items. Every op is checked against the template's content_schema before anything is
// applied: one bad op rejects the batch, so content_json never holds a value its schema
// cannot render.

export interface ContentIssue {
  path: string;
  message: string;
}

export interface ApplyResult {
  next: Record<string, unknown>;
  issues: ContentIssue[];
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function checkScalar(field: Field, value: unknown): string | null {
  switch (field.type) {
    case "text":
    case "richtext":
      if (typeof value !== "string") return "Expected text.";
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return `Too long — the limit is ${field.maxLength} characters.`;
      }
      return null;
    case "image":
      // An asset id, or null to clear the slot.
      if (value !== null && typeof value !== "string") return "Expected an asset id or null.";
      return null;
    case "color":
      if (typeof value !== "string" || !HEX_COLOR.test(value)) {
        return "Expected a hex colour like #1a2b3c.";
      }
      return null;
    case "select":
      if (typeof value !== "string" || !(field.options ?? []).includes(value)) {
        return `Expected one of: ${(field.options ?? []).join(", ")}.`;
      }
      return null;
    case "list":
      return "A list field is set with an array, not a scalar.";
  }
}

export function checkList(field: Field, value: unknown): string | null {
  if (!Array.isArray(value)) return "Expected an array of items.";

  const itemSchema = field.itemSchema ?? [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return `Item ${i + 1} must be an object.`;
    }
    const record = item as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      if (!itemSchema.some((f) => f.key === key)) {
        return `Item ${i + 1} has an unknown field "${key}".`;
      }
    }
    for (const itemField of itemSchema) {
      if (!(itemField.key in record)) {
        return `Item ${i + 1} is missing "${itemField.key}".`;
      }
      const message =
        itemField.type === "list"
          ? "Nested lists are not supported."
          : checkScalar(itemField, record[itemField.key]);
      if (message) return `Item ${i + 1}, "${itemField.key}": ${message}`;
    }
  }
  return null;
}

/**
 * Whether one value is allowed in one field, or why it is not (R2 D9).
 *
 * Exported so the content panel can say it before the request rather than after it: an edit
 * that the server will refuse should be visible as you type, next to the field, not two
 * seconds later as a message about "some edits".
 *
 * Deliberately the same function the write path uses rather than a second copy of the rules
 * written for the client. Two validators are two answers to the same question, and they
 * diverge in the direction that hurts — the panel accepting something the route rejects, so
 * the person is told their work saved when it did not.
 */
export function validateFieldValue(field: Field, value: unknown): string | null {
  return field.type === "list" ? checkList(field, value) : checkScalar(field, value);
}

function checkOp(schema: ContentSchema, op: ContentOp): string | null {
  const segments = op.path.split(".");
  if (segments.length !== 2) {
    return 'A content path has the form "section.field".';
  }
  const [sectionKey, fieldKey] = segments;

  const section = schema.sections.find((s) => s.key === sectionKey);
  if (!section) return `No section "${sectionKey}" in this template.`;

  const field = section.fields.find((f) => f.key === fieldKey);
  if (!field) return `No field "${fieldKey}" in section "${sectionKey}".`;

  return validateFieldValue(field, op.value);
}

export function applyContentOps(
  contentJson: Record<string, unknown>,
  ops: ContentOp[],
  schema: ContentSchema,
): ApplyResult {
  const issues: ContentIssue[] = [];
  for (const op of ops) {
    const message = checkOp(schema, op);
    if (message) issues.push({ path: op.path, message });
  }
  if (issues.length > 0) return { next: contentJson, issues };

  const next: Record<string, unknown> = { ...contentJson };
  for (const op of ops) {
    const [sectionKey, fieldKey] = op.path.split(".");
    const section = { ...((next[sectionKey] as Record<string, unknown>) ?? {}) };
    section[fieldKey] = op.value;
    next[sectionKey] = section;
  }
  return { next, issues };
}
