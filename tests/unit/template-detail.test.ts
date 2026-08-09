import { describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates";
import { madeOfLine, priceLine, toTemplateDetail } from "@/lib/templates/detail";

const free = TEMPLATES.find((t) => t.tier === "free")!;
const premium = TEMPLATES.find((t) => t.tier === "premium")!;

describe("toTemplateDetail", () => {
  it("carries the provenance the modal has to show (C-06)", () => {
    const detail = toTemplateDetail(free);

    expect(detail.license.trim()).not.toBe("");
    expect(detail.sourceUrl.trim()).not.toBe("");
  });

  it("sends the file map as a manifest, never the file bodies", () => {
    const detail = toTemplateDetail(free);
    const serialised = JSON.stringify(detail);

    expect(detail.files.map((f) => f.path)).toContain("index.html");
    for (const entry of detail.files) expect(entry.bytes).toBeGreaterThan(0);
    // The markup itself must not be in the response at all.
    expect(serialised).not.toContain("<!doctype html>");
    expect(serialised).not.toContain("data-slot=");
  });

  it("measures files in bytes on the wire, not characters", () => {
    const detail = toTemplateDetail({
      ...free,
      files: { "index.html": "₹" }, // one character, three bytes
    });

    expect(detail.files[0]!.bytes).toBe(3);
  });

  it("describes what is editable straight from content_schema (C-07)", () => {
    const detail = toTemplateDetail(free);

    expect(detail.editable.map((s) => s.key)).toEqual(
      free.contentSchema.sections.map((s) => s.key),
    );
    for (const section of detail.editable) expect(section.fields).toBeGreaterThan(0);
  });

  it("carries a parsed miniature so the modal never needs the files", () => {
    const detail = toTemplateDetail(free);

    expect(detail.preview.headline.trim()).not.toBe("");
    expect(detail.preview.palette.bg).toMatch(/^#/);
  });

  it("keeps the tier and its rupee price together", () => {
    expect(toTemplateDetail(premium)).toMatchObject({ tier: "premium", priceInr: 499 });
    expect(toTemplateDetail(free)).toMatchObject({ tier: "free", priceInr: 0 });
  });
});

// The one rule the D4 acceptance is explicit about: the price is stated beside the CTA
// before the choice, and a free design shows no price at all.
describe("priceLine", () => {
  it("states a paid design's price in rupees", () => {
    expect(priceLine("premium", 499)).toBe("Rs 499");
    expect(priceLine("signature", 999)).toBe("Rs 999");
  });

  it("shows no price for a free design", () => {
    expect(priceLine("free", 0)).toBeNull();
  });

  it("never renders Rs 0, whatever it is handed", () => {
    for (const t of TEMPLATES) {
      const line = priceLine(t.tier, t.priceInr);
      expect(line).not.toBe("Rs 0");
      if (t.tier === "free") expect(line).toBeNull();
      else expect(line).toContain(String(t.priceInr));
    }
  });
});

describe("madeOfLine", () => {
  it("reads the manifest out as pages and a size, not as filenames", () => {
    const line = madeOfLine([
      { path: "index.html", bytes: 4096 },
      { path: "styles.css", bytes: 2048 },
    ]);

    expect(line).toBe("1 page · 6 KB");
    expect(line).not.toContain("index.html");
    expect(line).not.toContain(".css");
  });

  it("counts more than one page", () => {
    expect(
      madeOfLine([
        { path: "index.html", bytes: 1024 },
        { path: "about.html", bytes: 1024 },
      ]),
    ).toBe("2 pages · 2 KB");
  });

  it("falls back to a size when a design ships no page at all", () => {
    expect(madeOfLine([{ path: "styles.css", bytes: 512 }])).toBe("512 bytes");
  });

  it("says something real for every design in the library", () => {
    for (const template of TEMPLATES) {
      expect(madeOfLine(toTemplateDetail(template).files)).toMatch(/^1 page · \d+ KB$/);
    }
  });
});
