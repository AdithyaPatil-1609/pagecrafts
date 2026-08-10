import { describe, expect, it } from "vitest";

import { TEMPLATES, validateTemplate } from "@/lib/templates";
import { checkConventions } from "@/lib/templates/conventions";
import { filterByCategory, toCategory } from "@/lib/discovery/categories";
import { INTENT_CARDS } from "@/lib/discovery/intent-cards";
import { rankForIntent, toIntent } from "@/lib/discovery/ranking";
import { toTemplateDetail } from "@/lib/templates/detail";

// The R2 D5 milestone, as tests.
//
//   "Skeleton walkable: sign in -> pick category -> see 10 real templates;
//    intent->gallery clickable with fake/real templates."
//
// Signing in is Adithya's and is exercised elsewhere. Everything after it is discovery's,
// and each leg of it is pinned here so the milestone cannot quietly come undone in week 2.

describe("D5 · ten real templates", () => {
  it("meets the week-1 floor of 10 (the first leg of 10 / 18 / 25)", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("each one is a real, whole template — tags, content_schema, provenance", () => {
    for (const template of TEMPLATES) {
      expect(validateTemplate(template), template.id).toEqual([]);
      expect(template.tags.length, `${template.id}: tags`).toBeGreaterThan(0);
      expect(
        template.contentSchema.sections.length,
        `${template.id}: content_schema`,
      ).toBeGreaterThan(0);
      expect(template.license.trim(), `${template.id}: licence`).not.toBe("");
      expect(template.sourceUrl, `${template.id}: source_url`).toMatch(/^https?:\/\//);
      expect(checkConventions(template.contentSchema), `${template.id}: conventions`).toEqual([]);
    }
  });
});

describe("D5 · pick a category, land somewhere with designs in it", () => {
  // The failure this guards against is a card that leads to an empty grid — the one thing
  // a first-choice screen must never do (D-6).
  it.each(INTENT_CARDS.map((card) => [card.label, card] as const))(
    "the %s card leads to a gallery with designs in it",
    (_label, card) => {
      const active = toCategory(card.category);
      const shown = filterByCategory(TEMPLATES, active);

      expect(shown.length).toBeGreaterThan(0);

      if (active) {
        // A bucket the library covers: the card filters to its own designs.
        expect(shown.every((t) => t.category === active)).toBe(true);
      } else {
        // A bucket with no design of its own. toCategory declines to filter and the whole
        // library shows — a deliberate fall-through, not an oversight (D-4, FR-035).
        expect(shown).toHaveLength(TEMPLATES.length);
      }
    },
  );

  it("every card is labelled and described in plain words, and appears once", () => {
    const categories = INTENT_CARDS.map((c) => c.category);
    expect(new Set(categories).size).toBe(categories.length);

    for (const card of INTENT_CARDS) {
      expect(card.label.trim()).not.toBe("");
      expect(card.description.trim()).not.toBe("");
    }
  });
});

describe("D5 · intent to gallery is clickable on ten real templates", () => {
  // What the describe screen puts in the URL after a successful classification.
  const describedAGym = { intent: "fitness", tone: "bold", palette: "dark" };

  it("a described site reaches the gallery with a usable intent", () => {
    expect(toIntent(describedAGym)).toEqual({
      category: "fitness",
      tone: "bold",
      palette: "dark",
    });
  });

  it("that intent leads with the right design and still shows ten or more", () => {
    const ranked = rankForIntent(TEMPLATES, toIntent(describedAGym)!);

    expect(ranked[0]!.category).toBe("fitness");
    expect(ranked.length).toBeGreaterThanOrEqual(10);
    expect(ranked[0]!.score).toBeGreaterThan(ranked[ranked.length - 1]!.score);
  });

  it("a classification that failed still reaches a full gallery (D-2: never blocked)", () => {
    // No intent params survive, so the gallery opens in the library's own order.
    expect(toIntent({ intent: undefined, tone: undefined, palette: undefined })).toBeUndefined();
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("every design on the grid can open its detail modal (the last click of the spine)", () => {
    for (const template of TEMPLATES) {
      const detail = toTemplateDetail(template);

      expect(detail.id).toBe(template.id);
      expect(detail.preview.headline.trim(), `${template.id}: preview`).not.toBe("");
      expect(detail.files.length, `${template.id}: files`).toBeGreaterThan(0);
      expect(detail.editable.length, `${template.id}: editable sections`).toBeGreaterThan(0);
    }
  });
});
