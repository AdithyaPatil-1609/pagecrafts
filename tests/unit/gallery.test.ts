import { describe, expect, it } from "vitest";

import { paletteOf, previewOf } from "@/lib/discovery/preview";
import {
  DEFAULT_SORT,
  SORT_KEYS,
  SORT_LABELS,
  sortTemplates,
  toSort,
} from "@/lib/discovery/sort";
import { TEMPLATES } from "@/lib/templates";

describe("toSort", () => {
  it("accepts every key the picker offers", () => {
    for (const key of SORT_KEYS) expect(toSort(key)).toBe(key);
  });

  it("falls back to the recommended order rather than throwing (D-4, FR-035)", () => {
    expect(toSort("cheapest")).toBe(DEFAULT_SORT);
    expect(toSort("")).toBe(DEFAULT_SORT);
    expect(toSort(undefined)).toBe(DEFAULT_SORT);
    expect(toSort(null)).toBe(DEFAULT_SORT);
    expect(toSort("__proto__")).toBe(DEFAULT_SORT);
  });

  it("labels every key", () => {
    for (const key of SORT_KEYS) expect(SORT_LABELS[key].trim()).not.toBe("");
  });
});

describe("sortTemplates", () => {
  it("never reorders the registry in place", () => {
    const before = [...TEMPLATES];
    sortTemplates(TEMPLATES, "name");
    expect(TEMPLATES).toEqual(before);
  });

  it("keeps every template, whatever the order", () => {
    for (const key of SORT_KEYS) {
      const sorted = sortTemplates(TEMPLATES, key);
      expect(sorted).toHaveLength(TEMPLATES.length);
      expect(new Set(sorted.map((t) => t.id))).toEqual(
        new Set(TEMPLATES.map((t) => t.id)),
      );
    }
  });

  it("leaves the recommended order exactly as the library declares it", () => {
    expect(sortTemplates(TEMPLATES, "recommended")).toEqual(TEMPLATES);
  });

  it("puts free designs first, then premium, then signature", () => {
    const tiers = sortTemplates(TEMPLATES, "free-first").map((t) => t.tier);
    const rank = { free: 0, premium: 1, signature: 2 } as const;
    for (let i = 1; i < tiers.length; i += 1) {
      expect(rank[tiers[i]!]).toBeGreaterThanOrEqual(rank[tiers[i - 1]!]);
    }
  });

  it("reverses that ladder for premium-first", () => {
    const tiers = sortTemplates(TEMPLATES, "premium-first").map((t) => t.tier);
    const rank = { free: 0, premium: 1, signature: 2 } as const;
    for (let i = 1; i < tiers.length; i += 1) {
      expect(rank[tiers[i]!]).toBeLessThanOrEqual(rank[tiers[i - 1]!]);
    }
  });

  it("sorts by name alphabetically", () => {
    const names = sortTemplates(TEMPLATES, "name").map((t) => t.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("paletteOf", () => {
  it("reads the surface from --bg or --paper, whichever the design declares", () => {
    expect(paletteOf(":root { --bg: #0b0b12; --ink: #ffffff; }").bg).toBe("#0b0b12");
    expect(paletteOf(":root { --paper: #fafaf9; --ink: #000000; }").bg).toBe("#fafaf9");
  });

  it("ignores anything that is not a plain hex colour", () => {
    const palette = paletteOf(
      ":root { --bg: url(evil.png); --ink: var(--x); --accent: red; }",
    );
    expect(palette.bg).toBe("#ffffff");
    expect(palette.ink).toBe("#171717");
    expect(palette.accent).toBe("#171717");
  });

  it("falls back completely when there is no stylesheet", () => {
    expect(paletteOf(undefined).bg).toBe("#ffffff");
  });
});

describe("previewOf", () => {
  it("shows every template's own hero copy, not a placeholder", () => {
    for (const template of TEMPLATES) {
      const preview = previewOf(template);
      const headline = template.files["index.html"]?.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);

      expect(preview.headline.trim()).not.toBe("");
      if (headline) {
        expect(preview.headline).toBe(
          headline[1]!.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
        );
      }
    }
  });

  it("strips markup and decodes entities out of the headline", () => {
    const preview = previewOf({
      ...TEMPLATES[0]!,
      files: {
        "index.html": "<h1>Tea <em>&amp;</em>\n  cake</h1><p>Since &#39;98</p>",
      },
    });

    expect(preview.headline).toBe("Tea & cake");
    expect(preview.subhead).toBe("Since '98");
  });

  it("falls back to the catalogue entry when a template has no hero markup", () => {
    const template = { ...TEMPLATES[0]!, files: { "index.html": "<div>nothing</div>" } };
    const preview = previewOf(template);

    expect(preview.headline).toBe(template.name);
    expect(preview.subhead).toBe(template.description);
  });

  it("gives every template in the library a palette and a shape", () => {
    for (const template of TEMPLATES) {
      const preview = previewOf(template);
      expect(preview.palette.bg).toMatch(/^#[0-9a-f]{3,8}$/i);
      expect(["split", "gallery", "editorial"]).toContain(preview.shape);
    }
  });
});
