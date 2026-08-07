import { describe, expect, it } from "vitest";

import { paletteOf, previewOf } from "@/lib/discovery/preview";
import { MOTIF_BY_CATEGORY, MOTIFS, motifToSvg } from "@/lib/templates/motifs";
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

  it("reads the hero photograph off every design that ships one", () => {
    for (const template of TEMPLATES) {
      const preview = previewOf(template);
      // Every design in the refreshed library leads with a photograph.
      expect(preview.heroImage, `${template.id} has no hero image`).toMatch(/^https:\/\//);
      // Whatever the tile shows must be the src in the template's own markup.
      expect(template.files["index.html"]).toContain(`src="${preview.heroImage}"`);
    }
  });

  it("drops a hero image that is not an absolute https URL, rather than passing it to an <img>", () => {
    for (const src of ["../evil.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "http://x/y.jpg"]) {
      const preview = previewOf({
        ...TEMPLATES[0]!,
        files: {
          "index.html": `<div class="hero-frame" data-slot="hero.image"><img src="${src}" /></div>`,
        },
      });
      expect(preview.heroImage).toBeUndefined();
    }
  });

  it("gives every template in the library a palette, a layout and a motif", () => {
    for (const template of TEMPLATES) {
      const preview = previewOf(template);
      expect(preview.palette.bg).toMatch(/^#[0-9a-f]{3,8}$/i);
      expect(["split", "full-bleed", "centered", "showcase"]).toContain(preview.layout);
      expect(MOTIFS[preview.motif]).toBeDefined();
    }
  });

  it("reads the real navigation and button label off every template", () => {
    for (const template of TEMPLATES) {
      const preview = previewOf(template);

      expect(preview.nav.length).toBeGreaterThan(0);
      expect(preview.cta.trim()).not.toBe("");
      expect(preview.wordmark).toBe(template.name);
      // Whatever the tile shows must be in the template's own markup.
      for (const label of preview.nav) {
        expect(template.files["index.html"]).toContain(`>${label}</a>`);
      }
    }
  });

  it("falls back to a safe layout and motif for markup that declares neither", () => {
    const preview = previewOf({
      ...TEMPLATES[0]!,
      files: { "index.html": "<h1>Bare</h1>" },
    });

    expect(preview.layout).toBe("split");
    expect(preview.motif).toBe("frame");
    expect(preview.nav).toEqual([]);
    expect(preview.cta).toBe("");
  });
});

describe("motifs", () => {
  const palette = {
    bg: "#000000",
    ink: "#ffffff",
    muted: "#888888",
    accent: "#ff0000",
    panel: "#111111",
  };

  it("draws the same shape count in both renderers, so tile and template cannot drift", () => {
    for (const id of Object.keys(MOTIFS) as (keyof typeof MOTIFS)[]) {
      const svg = motifToSvg(id, palette);
      const drawn = (svg.match(/<(circle|rect|path)\b/g) ?? []).length;
      expect(drawn).toBe(MOTIFS[id].shapes.length);
      expect(svg).toContain(`data-motif="${id}"`);
    }
  });

  it("only ever paints with the palette it was given", () => {
    const svg = motifToSvg("arcs", palette);
    const colours = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)].map((m) => m[1]);
    for (const colour of colours) {
      expect(Object.values(palette)).toContain(colour);
    }
  });

  it("every category in the library maps to a motif that exists", () => {
    for (const template of TEMPLATES) {
      expect(MOTIFS[MOTIF_BY_CATEGORY[template.category]!]).toBeDefined();
    }
  });
});
