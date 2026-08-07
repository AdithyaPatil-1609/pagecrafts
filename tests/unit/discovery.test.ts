import { describe, expect, it } from "vitest";

import {
  CATEGORY_CARDS,
  CATEGORY_LABELS,
  filterByCategory,
  toCategory,
} from "@/lib/discovery/categories";
import { TEMPLATES } from "@/lib/templates";

describe("toCategory", () => {
  it("accepts every value of the frozen enum", () => {
    for (const category of CATEGORY_CARDS) {
      expect(toCategory(category)).toBe(category);
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
  it("offers exactly the twelve designs the library ships, each unique and labelled (D-6)", () => {
    expect(CATEGORY_CARDS).toHaveLength(12);
    expect(new Set(CATEGORY_CARDS).size).toBe(CATEGORY_CARDS.length);
    // Every card is a real Category with a human-readable label.
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
