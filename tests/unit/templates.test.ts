import { describe, expect, it } from "vitest";

import { TEMPLATES, validateTemplate } from "@/lib/templates";
import { templateRow } from "@/lib/templates/row";

// A representative free design from the registry, used to exercise the provenance and
// pricing checks. Portfolio is the free, first-class entry the library has always shipped.
const portfolio = TEMPLATES.find((t) => t.id === "portfolio")!;

describe("template library", () => {
  it("has at least one real template (D1 floor: the first entry)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(1);
  });

  it("meets the D2 sourcing floor (3-4 total real templates)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it("meets the D4 batch floor (~6-7 real templates)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it("meets the D5 milestone floor (10 real templates, week-1 leg of 10/18/25)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  // What the D4 14:00 batch is actually accepted on, and what the week-4 licence audit
  // (D18) will re-run against 25: every entry names a licence and where it came from.
  it("records non-null provenance for every template, one by one (C-06)", () => {
    for (const t of TEMPLATES) {
      expect(t.license.trim(), `${t.id}: license`).not.toBe("");
      expect(t.sourceUrl.trim(), `${t.id}: source_url`).not.toBe("");
      expect(t.sourceUrl, `${t.id}: source_url must be a URL`).toMatch(/^https?:\/\//);
    }
  });

  it("has unique ids and spans more than one category", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(TEMPLATES.map((t) => t.category)).size).toBeGreaterThan(1);
  });

  it("a free template validates: non-null provenance and a valid, correctly-priced tier", () => {
    expect(validateTemplate(portfolio)).toEqual([]);
    expect(portfolio.license.trim()).not.toBe("");
    expect(portfolio.sourceUrl.trim()).not.toBe("");
    expect(["free", "premium", "signature"]).toContain(portfolio.tier);
    expect(portfolio.priceInr).toBe(0);
  });

  it("every template in the registry validates", () => {
    for (const t of TEMPLATES) {
      expect(validateTemplate(t)).toEqual([]);
    }
  });

  it("rejects a template with missing provenance", () => {
    const bad = { ...portfolio, license: "" };
    expect(validateTemplate(bad)).toContain("license is required (C-06)");
  });
});

// The content panel is generated from `content_schema` and nothing else (FR-001, zero
// per-template UI). That only works while the markup's slots and the schema describe the
// same set of editable things — a slot with no field is uneditable, a field with no slot
// edits nothing. Both failures are silent in the browser, so they are caught here.
describe("slot / schema parity", () => {
  function slotsOf(template: (typeof TEMPLATES)[number]): string[] {
    const html = template.files["index.html"] ?? "";
    return [...html.matchAll(/data-slot="([^"]+)"/g)].map((match) => match[1]!);
  }

  function fieldPaths(template: (typeof TEMPLATES)[number]): Set<string> {
    const paths = new Set<string>();

    for (const section of template.contentSchema.sections) {
      for (const field of section.fields) {
        if (field.type === "list") {
          // Lists are addressed per item: `<section>.<field>.<index>.<key>`.
          for (const item of field.itemSchema ?? []) {
            paths.add(`${section.key}.${field.key}.*.${item.key}`);
          }
          continue;
        }
        paths.add(`${section.key}.${field.key}`);
      }
    }

    return paths;
  }

  it("every slot in every template resolves to a field in its schema", () => {
    for (const template of TEMPLATES) {
      const paths = fieldPaths(template);

      for (const slot of slotsOf(template)) {
        // Collapse the list index so `work.items.2.title` matches `work.items.*.title`.
        const generalised = slot.replace(/\.\d+\./, ".*.");
        expect(paths, `${template.id}: slot "${slot}" has no field`).toContain(generalised);
      }
    }
  });

  it("every field in every schema is reachable from the markup", () => {
    for (const template of TEMPLATES) {
      const slots = new Set(slotsOf(template).map((s) => s.replace(/\.\d+\./, ".*.")));

      for (const path of fieldPaths(template)) {
        expect(slots, `${template.id}: field "${path}" has no slot`).toContain(path);
      }
    }
  });
});

describe("the row the seed writes", () => {
  it("uses a null thumbnail until a real https image exists", () => {
    for (const template of TEMPLATES) {
      const row = templateRow(template);
      expect(
        row.thumbnail_url === null || /^https:\/\//.test(row.thumbnail_url),
        `${template.id}: thumbnail_url must be https or null, got ${row.thumbnail_url}`,
      ).toBe(true);
    }
  });
});
