import { describe, it, expect } from "vitest";
import { applyContentOps } from "@/lib/content/apply-ops";
import type { ContentSchema } from "@/lib/contracts";

const schema: ContentSchema = {
  sections: [
    {
      key: "hero",
      label: "Hero",
      fields: [
        { key: "headline", label: "Headline", type: "text", maxLength: 80 },
        { key: "image", label: "Photo", type: "image" },
        { key: "accent", label: "Accent", type: "color" },
        { key: "align", label: "Alignment", type: "select", options: ["left", "center"] },
      ],
    },
    {
      key: "menu",
      label: "Menu",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "list",
          itemSchema: [
            { key: "name", label: "Name", type: "text", maxLength: 40 },
            { key: "price", label: "Price", type: "text" },
          ],
        },
      ],
    },
  ],
};

describe("applyContentOps", () => {
  it("applies a valid text edit without touching other sections", () => {
    const { next, issues } = applyContentOps(
      { hero: { headline: "Old" }, menu: { items: [] } },
      [{ path: "hero.headline", value: "New headline" }],
      schema,
    );
    expect(issues).toEqual([]);
    expect(next.hero).toEqual({ headline: "New headline" });
    expect(next.menu).toEqual({ items: [] });
  });

  it("does not mutate the input content_json", () => {
    const original = { hero: { headline: "Old" } };
    applyContentOps(original, [{ path: "hero.headline", value: "New" }], schema);
    expect(original.hero.headline).toBe("Old");
  });

  it("rejects an unknown section and an unknown field", () => {
    const { issues } = applyContentOps(
      {},
      [
        { path: "footer.text", value: "x" },
        { path: "hero.subtitle", value: "x" },
      ],
      schema,
    );
    expect(issues).toHaveLength(2);
    expect(issues[0].message).toContain('No section "footer"');
    expect(issues[1].message).toContain('No field "subtitle"');
  });

  it("rejects a malformed path", () => {
    const { issues } = applyContentOps({}, [{ path: "headline", value: "x" }], schema);
    expect(issues[0].message).toContain('"section.field"');
  });

  it("enforces maxLength on text", () => {
    const { issues } = applyContentOps(
      {},
      [{ path: "hero.headline", value: "x".repeat(81) }],
      schema,
    );
    expect(issues[0].message).toContain("limit is 80");
  });

  it("validates colour, select and image values", () => {
    const bad = applyContentOps(
      {},
      [
        { path: "hero.accent", value: "red" },
        { path: "hero.align", value: "justify" },
        { path: "hero.image", value: 7 },
      ],
      schema,
    );
    expect(bad.issues).toHaveLength(3);

    const good = applyContentOps(
      {},
      [
        { path: "hero.accent", value: "#1a2b3c" },
        { path: "hero.align", value: "center" },
        { path: "hero.image", value: null },
      ],
      schema,
    );
    expect(good.issues).toEqual([]);
    expect(good.next.hero).toEqual({ accent: "#1a2b3c", align: "center", image: null });
  });

  it("sets a list field whole and validates each item", () => {
    const good = applyContentOps(
      {},
      [{ path: "menu.items", value: [{ name: "Dosa", price: "Rs 80" }] }],
      schema,
    );
    expect(good.issues).toEqual([]);
    expect(good.next.menu).toEqual({ items: [{ name: "Dosa", price: "Rs 80" }] });

    const missing = applyContentOps(
      {},
      [{ path: "menu.items", value: [{ name: "Dosa" }] }],
      schema,
    );
    expect(missing.issues[0].message).toContain('missing "price"');

    const unknown = applyContentOps(
      {},
      [{ path: "menu.items", value: [{ name: "Dosa", price: "Rs 80", spicy: true }] }],
      schema,
    );
    expect(unknown.issues[0].message).toContain('unknown field "spicy"');
  });

  it("one invalid op rejects the whole batch", () => {
    const { next, issues } = applyContentOps(
      { hero: { headline: "Old" } },
      [
        { path: "hero.headline", value: "New" },
        { path: "hero.accent", value: "not-a-colour" },
      ],
      schema,
    );
    expect(issues).toHaveLength(1);
    expect(next).toEqual({ hero: { headline: "Old" } });
  });
});
