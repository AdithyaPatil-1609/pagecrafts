import { describe, expect, it } from "vitest";

import {
  CATEGORY_CARDS,
  CATEGORY_LABELS,
  filterByCategory,
  toCategory,
} from "@/lib/discovery/categories";
import { TEMPLATES } from "@/lib/templates";
import { CATEGORY_IDS } from "@/lib/contracts";

describe("toCategory", () => {
  it("accepts every value of the frozen enum", () => {
    for (const category of CATEGORY_CARDS) {
      expect(toCategory(category)).toBe(category);
    }
  });

  /**
   * Why this is gated on CATEGORY_CARDS and not on the full CATEGORY_IDS enum:
   * a card is only a card when the library ships a design for it (D-6), so
   * gating here is what guarantees an accepted filter can never produce an
   * empty grid. Widening this to the whole enum would let `?category=saas`
   * through to a page with nothing on it — the outcome D-4 and FR-035 exist to
   * avoid. An uncarded bucket is ignored, and ignoring it shows the whole
   * library.
   */
  it("never accepts a category that would produce an empty grid (D-4, D-6)", () => {
    for (const category of CATEGORY_CARDS) {
      expect(filterByCategory(TEMPLATES, toCategory(category)).length, category)
        .toBeGreaterThan(0);
    }
  });

  it("ignores an enum bucket the library ships no design for", () => {
    const shipped = new Set(TEMPLATES.map((t) => t.category));
    const orphans = CATEGORY_IDS.filter((c) => !shipped.has(c));

    // There are such buckets — the classifier can still emit them — and each
    // must route to the unfiltered gallery rather than stranding the user.
    expect(orphans.length).toBeGreaterThan(0);
    for (const category of orphans) {
      expect(toCategory(category), category).toBeUndefined();
      expect(filterByCategory(TEMPLATES, toCategory(category))).toHaveLength(TEMPLATES.length);
    }
  });

  it("ignores anything that is not a category rather than throwing (D-4, FR-035)", () => {
    expect(toCategory("bakery")).toBeUndefined();
    expect(toCategory("")).toBeUndefined();
    expect(toCategory(undefined)).toBeUndefined();
    expect(toCategory(null)).toBeUndefined();
    expect(toCategory("PORTFOLIO")).toBeUndefined();
    expect(toCategory("__proto__")).toBeUndefined();
    expect(toCategory("constructor")).toBeUndefined();
  });
});

describe("category cards", () => {
  // Stated as the rule rather than as a count: the cards are exactly the buckets the
  // library ships a design for. A count has to be edited every time designs are added,
  // library ships a design for. A count has to be edited every time a design is added,
  // and an edited expectation stops being a check.
  it("offers exactly the buckets the library ships a design for, each once (D-6)", () => {
    const shipped = new Set(TEMPLATES.map((t) => t.category));
    const carded = new Set(CATEGORY_CARDS);

    // Named both ways round before the array comparison. Comparing two
    // thirty-five element arrays tells you they differ and leaves you to diff
    // them by eye, which is how `store` stayed missing: fourteen designs with
    // no shelf, and a failure nobody could read at a glance.
    expect({
      shippedButNoCard: [...shipped].filter((c) => !carded.has(c)).sort(),
      cardedButNoDesign: [...carded].filter((c) => !shipped.has(c)).sort(),
    }).toEqual({ shippedButNoCard: [], cardedButNoDesign: [] });

    expect([...CATEGORY_CARDS].sort()).toEqual([...shipped].sort());
    expect(new Set(CATEGORY_CARDS).size).toBe(CATEGORY_CARDS.length);
    for (const category of CATEGORY_CARDS) {
      expect(CATEGORY_LABELS[category]?.trim()).not.toBe("");
    }
  });

  it("labels every card with something a non-technical reader can read", () => {
    for (const category of CATEGORY_CARDS) {
      expect(CATEGORY_LABELS[category].trim()).not.toBe("");
    }
  });
});

describe("filterByCategory", () => {
  it("returns the whole library when no category is given — absent is not empty (D-4)", () => {
    expect(filterByCategory(TEMPLATES, undefined)).toHaveLength(TEMPLATES.length);
  });

  it("returns only templates in the chosen category", () => {
    const portfolio = filterByCategory(TEMPLATES, "portfolio");
    expect(portfolio.length).toBeGreaterThan(0);
    for (const t of portfolio) expect(t.category).toBe("portfolio");
  });

  it("never strands a user: every category the intent screen offers has a template", () => {
    for (const category of CATEGORY_CARDS) {
      expect(
        filterByCategory(TEMPLATES, category).length,
        `no template for category "${category}"`,
      ).toBeGreaterThan(0);
    }
  });

  it("does not mutate the library it filters", () => {
    const before = TEMPLATES.length;
    filterByCategory(TEMPLATES, "blog");
    expect(TEMPLATES).toHaveLength(before);
  });
});
