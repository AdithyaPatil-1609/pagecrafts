import type { ContentSchema, Field, FileMap } from "@/lib/contracts";
import { applyContentToHtml } from "./slots";
import { applySiteMetaToHtml } from "./site-meta";

/** Facts collected on the brief screen, used to replace placeholder copy in a design. */
export interface TemplateFacts {
  name: string;
  offer: string;
  place: string;
  phone?: string;
  hours?: string;
  extra?: string;
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clip(value: string, max?: number): string {
  const text = clean(value);
  if (!max || text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function subhead(facts: TemplateFacts, max?: number): string {
  const offer = clean(facts.offer);
  const place = clean(facts.place);
  const extra = clean(facts.extra);
  const parts = [place ? `${offer} in ${place}` : offer, extra].filter(Boolean);
  return clip(parts.join(". "), max);
}

function footer(facts: TemplateFacts, max?: number): string {
  const name = clean(facts.name);
  const place = clean(facts.place);
  return clip(place ? `${name} · ${place}` : name, max);
}

function fieldRole(sectionKey: string, field: Field): "name" | "subhead" | "place" | "phone" | "hours" | "footer" | "skip" {
  const key = `${sectionKey}.${field.key}`.toLowerCase();
  if (field.type === "image" || field.type === "backgroundImage") return "skip";
  if (field.type === "color" || field.type === "select") return "skip";
  if (field.type === "list") return "skip";
  if (/(phone|tel|mobile|whatsapp)/.test(key)) return "phone";
  if (/(hour|open|timing)/.test(key)) return "hours";
  if (/(place|city|location|address|area|neighbourhood|neighborhood)/.test(key)) return "place";
  if (sectionKey === "site" && field.key === "footer") return "footer";
  if (sectionKey === "site" && field.key === "name") return "name";
  if (sectionKey === "hero" && field.key === "headline") return "name";
  if (sectionKey === "hero" && field.key === "subhead") return "subhead";
  return "skip";
}

/**
 * Overlay the business facts onto a design's content map. Layout, photos and
 * section structure stay; the name, place and offer replace the placeholders.
 */
export function personaliseContent(
  schema: ContentSchema,
  current: Record<string, unknown>,
  facts: TemplateFacts,
): Record<string, Record<string, unknown>> {
  const name = clean(facts.name);
  const place = clean(facts.place);
  const phone = clean(facts.phone);
  const hours = clean(facts.hours);
  const next: Record<string, Record<string, unknown>> = {};

  for (const section of schema.sections) {
    const prior = (current[section.key] ?? {}) as Record<string, unknown>;
    const values: Record<string, unknown> = { ...prior };

    for (const field of section.fields) {
      const role = fieldRole(section.key, field);
      if (role === "skip") continue;

      const written =
        role === "name"
          ? clip(name, field.maxLength)
          : role === "subhead"
            ? subhead(facts, field.maxLength)
            : role === "place"
              ? clip(place, field.maxLength)
              : role === "phone"
                ? clip(phone, field.maxLength)
                : role === "hours"
                  ? clip(hours, field.maxLength)
                  : footer(facts, field.maxLength);

      if (!written) continue;
      values[field.key] = written;
    }

    next[section.key] = values;
  }

  return next;
}

/** Write personalised copy into the design's HTML files and return the new tree. */
export function personaliseFiles(
  files: FileMap,
  schema: ContentSchema,
  content: Record<string, Record<string, unknown>>,
  facts: TemplateFacts,
): FileMap {
  const html = files["index.html"];
  if (!html) return files;

  const withSlots = applyContentToHtml(html, schema, content);
  const titled = applySiteMetaToHtml(withSlots, {
    meta: {
      title: clean(facts.name),
      description: clip(subhead(facts), 500),
    },
    formEndpoint: null,
  });

  return { ...files, "index.html": titled };
}
