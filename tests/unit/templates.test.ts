import { describe, expect, it } from "vitest";

import { TEMPLATES, validateTemplate } from "@/lib/templates";
import { aurora } from "@/lib/templates/aurora";

describe("template library", () => {
  it("has at least one real template (D1 floor: the first entry)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(1);
  });

  it("meets the D2 sourcing floor (3-4 total real templates)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it("has unique ids and spans more than one category", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(TEMPLATES.map((t) => t.category)).size).toBeGreaterThan(1);
  });

  it("first template validates: non-null provenance and a valid, correctly-priced tier", () => {
    expect(validateTemplate(aurora)).toEqual([]);
    expect(aurora.license.trim()).not.toBe("");
    expect(aurora.sourceUrl.trim()).not.toBe("");
    expect(["free", "premium", "signature"]).toContain(aurora.tier);
    expect(aurora.priceInr).toBe(0);
  });

  it("every template in the registry validates", () => {
    for (const t of TEMPLATES) {
      expect(validateTemplate(t)).toEqual([]);
    }
  });

  it("rejects a template with missing provenance", () => {
    const bad = { ...aurora, license: "" };
    expect(validateTemplate(bad)).toContain("license is required (C-06)");
  });
});
