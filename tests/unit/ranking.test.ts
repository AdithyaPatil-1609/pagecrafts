import { describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates";
import { filterByCategory } from "@/lib/discovery/categories";
import { intentParams, rankForIntent, toIntent } from "@/lib/discovery/ranking";
import { queryTemplates } from "@/lib/templates/query";

describe("toIntent", () => {
  it("reads a full classification out of the URL", () => {
    expect(toIntent({ intent: "food", tone: "warm", palette: "dark" })).toEqual({
      category: "food",
      tone: "warm",
      palette: "dark",
    });
  });

  it("keeps the parts that are valid and drops the rest", () => {
    expect(toIntent({ intent: "food", tone: "loud", palette: "chartreuse" })).toEqual({
      category: "food",
    });
  });

  it("returns undefined when nothing usable survives — order the library normally", () => {
    expect(toIntent({})).toBeUndefined();
    expect(toIntent({ intent: "", tone: null, palette: undefined })).toBeUndefined();
    expect(toIntent({ intent: "not-a-category" })).toBeUndefined();
    expect(toIntent({ intent: "__proto__" })).toBeUndefined();
  });

  it("round-trips through URL params", () => {
    const intent = toIntent({
      intent: "fitness",
      vertical: "personal-trainer",
      tone: "bold",
      palette: "dark",
    });
    expect(intentParams(intent)).toEqual({
      intent: "fitness",
      vertical: "personal-trainer",
      tone: "bold",
      palette: "dark",
    });
    expect(toIntent(intentParams(intent))).toEqual(intent);
  });

  it("drops a malformed vertical rather than letting arbitrary URL text into ranking", () => {
    expect(toIntent({ vertical: "../dental clinic" })).toBeUndefined();
  });

  it("carries nothing when there is no intent", () => {
    expect(intentParams(undefined)).toEqual({});
  });
});

describe("rankForIntent", () => {
  it("leads with the design in the classified category", () => {
    const ranked = rankForIntent(TEMPLATES, { category: "fitness" });
    expect(ranked[0]!.category).toBe("fitness");
  });

  it("shows the whole library — a guess reorders, it never removes (D-6)", () => {
    const ranked = rankForIntent(TEMPLATES, { category: "fitness", tone: "bold" });

    expect(ranked).toHaveLength(TEMPLATES.length);
    expect(new Set(ranked.map((t) => t.id))).toEqual(new Set(TEMPLATES.map((t) => t.id)));
  });

  it("orders by descending score", () => {
    const scores = rankForIntent(TEMPLATES, {
      category: "food",
      tone: "warm",
      palette: "dark",
    }).map((t) => t.score);

    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
    }
  });

  it("puts a design matching category, tone and palette above one matching category alone", () => {
    // The restaurant design is food + dark + warm; the cafe-ish others are not all three.
    const ranked = rankForIntent(TEMPLATES, { category: "food", tone: "warm", palette: "dark" });
    const restaurant = ranked.find((t) => t.id === "restaurant")!;
    const otherFood = ranked.filter((t) => t.category === "food" && t.id !== "restaurant");

    for (const t of otherFood) expect(restaurant.score).toBeGreaterThanOrEqual(t.score);
  });

  it("is deterministic — the same query gives the same order every time (D-5)", () => {
    const query = { category: "portfolio", tone: "minimal", palette: "light" } as const;
    const first = rankForIntent(TEMPLATES, query).map((t) => t.id);
    const second = rankForIntent(TEMPLATES, query).map((t) => t.id);

    expect(second).toEqual(first);
  });

  it("breaks ties by id, so equal scores never shuffle between loads", () => {
    const ranked = rankForIntent(TEMPLATES, { tone: "nonexistent" as never });
    expect(ranked.map((t) => t.id)).toEqual([...TEMPLATES.map((t) => t.id)].sort());
  });

  it("never reorders the registry in place", () => {
    const before = TEMPLATES.map((t) => t.id);
    rankForIntent(TEMPLATES, { category: "travel" });
    expect(TEMPLATES.map((t) => t.id)).toEqual(before);
  });

  it("ranks within an explicit category filter rather than fighting it", () => {
    const shortlist = filterByCategory(TEMPLATES, "food");
    const ranked = rankForIntent(shortlist, { category: "food", palette: "dark" });

    expect(ranked).toHaveLength(shortlist.length);
    expect(ranked.every((t) => t.category === "food")).toBe(true);
  });
});

// The distinction the whole D5 ordering rests on: a picked category narrows the library, a
// guessed one only reorders it.
describe("a guess ranks where a pick filters", () => {
  it("a picked category can leave a single design on screen", () => {
    expect(filterByCategory(TEMPLATES, "fitness").length).toBeLessThan(TEMPLATES.length);
  });

  it("a guessed category still shows every design, best first", () => {
    const ranked = rankForIntent(TEMPLATES, { category: "fitness" });

    expect(ranked.length).toBe(TEMPLATES.length);
    expect(ranked.length).toBeGreaterThanOrEqual(10); // the D5 milestone floor
    expect(ranked[0]!.category).toBe("fitness");
  });
});

// The gallery only ranks under the recommended sort; an explicit sort is an instruction.
describe("ranking and the sort picker", () => {
  const intent = { category: "fitness", tone: "bold", palette: "dark" } as const;

  it("an explicit sort wins over the ranking", () => {
    const byName = queryTemplates({ sort: "name" }).items.map((t) => t.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));

    const ranked = rankForIntent(TEMPLATES, intent).map((t) => t.name);
    expect(ranked).not.toEqual(byName);
  });

  it("both orders hold the same designs, so switching sort never loses one", () => {
    for (const key of ["free-first", "premium-first", "name"] as const) {
      expect(new Set(queryTemplates({ sort: key }).items.map((t) => t.id))).toEqual(
        new Set(rankForIntent(TEMPLATES, intent).map((t) => t.id)),
      );
    }
  });
});
