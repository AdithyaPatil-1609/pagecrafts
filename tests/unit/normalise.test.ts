import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/contracts";
import { TEMPLATES, validateTemplate } from "@/lib/templates";
import { draftContentSchema, normaliseTemplate, type SourceTemplate } from "@/lib/templates/normalise";

// The checked-in source directory the CLI ships against — hand-written markup with its own
// class names, nothing generated. If the normaliser only ever worked on our own output it
// would prove nothing about sourcing.
const SOURCE_DIR = join(process.cwd(), "data", "templates", "sources", "cafe");
const read = (file: string) => readFileSync(join(SOURCE_DIR, file), "utf8");

function cafeSource(overrides: Partial<SourceTemplate> = {}): SourceTemplate {
  return {
    ...(JSON.parse(read("template.json")) as SourceTemplate),
    files: { "index.html": read("index.html"), "styles.css": read("styles.css") },
    ...overrides,
  };
}

describe("normaliseTemplate", () => {
  it("turns a real source directory into a valid record (D4 acceptance)", () => {
    const result = normaliseTemplate(cafeSource());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Valid by the same gate the registry is held to, not a looser one.
    expect(validateTemplate(result.template)).toEqual([]);
    expect(result.template.id).toBe("cafe");
    expect(result.template.license).toBe("MIT");
    expect(result.template.sourceUrl).not.toBe("");
    expect(result.template.priceInr).toBe(0);
  });

  it("rejects a source with no licence, and says why (C-06)", () => {
    const result = normaliseTemplate(cafeSource({ license: "   " }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("license is required (C-06)");
  });

  it("rejects a source with no source_url (C-06)", () => {
    const result = normaliseTemplate(cafeSource({ sourceUrl: "" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("source_url is required (C-06)");
  });

  it("rejects a source with no markup to draft a schema from", () => {
    const result = normaliseTemplate(cafeSource({ files: { "styles.css": read("styles.css") } }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("index.html is required");
  });

  it("reports every reason at once rather than the first", () => {
    const result = normaliseTemplate(cafeSource({ license: "", sourceUrl: "", id: "Not Kebab" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });

  it("infers the category from the design's own copy, and warns that it guessed", () => {
    const result = normaliseTemplate(cafeSource({ category: undefined }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.category).toBe("food");
    expect(result.warnings.join(" ")).toContain("category inferred");
  });

  it("keeps a declared category instead of guessing over it", () => {
    const result = normaliseTemplate(cafeSource({ category: "business" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.category).toBe("business");
    expect(result.warnings.join(" ")).not.toContain("category inferred");
  });

  it("tags the design with its category, tone and layout", () => {
    const result = normaliseTemplate(cafeSource());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.tags).toContain("food");
    expect(result.template.tags).toContain("light"); // --bg is a warm off-white
    expect(result.template.tags).toContain("split"); // data-layout on <body>
    expect(result.template.tags.length).toBeLessThanOrEqual(6);
  });

  it("records an undeclared tier as free rather than assuming a price", () => {
    const result = normaliseTemplate(cafeSource({ tier: undefined }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.tier).toBe("free");
    expect(result.template.priceInr).toBe(0);
    expect(result.warnings.join(" ")).toContain("recorded as free");
  });

  it("prices a premium source at the tier's rupee price (Doc 22 P2)", () => {
    const result = normaliseTemplate(cafeSource({ tier: "premium" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.priceInr).toBe(499);
  });
});

describe("draftContentSchema", () => {
  const fieldsOf = (html: string, sectionKey: string): Field[] =>
    draftContentSchema(html).schema.sections.find((s) => s.key === sectionKey)?.fields ?? [];

  it("reads an <img> slot as an image field whatever the key is called", () => {
    const fields = fieldsOf('<img data-slot="hero.snapshot" src="a.jpg" />', "hero");
    expect(fields[0]).toMatchObject({ key: "snapshot", type: "image" });
  });

  it("reads an image-ish key as an image field whatever the element is", () => {
    const fields = fieldsOf('<div data-slot="hero.logo"></div>', "hero");
    expect(fields[0]).toMatchObject({ key: "logo", type: "image" });
  });

  it("gives prose a rich-text field at section level but not inside a card", () => {
    const html = `
      <p data-slot="about.body">Long form.</p>
      <p data-slot="about.items.0.body">One line.</p>`;
    const fields = fieldsOf(html, "about");

    expect(fields.find((f) => f.key === "body")).toMatchObject({ type: "richtext" });
    const list = fields.find((f) => f.key === "items");
    expect(list?.itemSchema?.[0]).toMatchObject({ key: "body", type: "text", maxLength: 160 });
  });

  it("turns data-options into a select with its choices", () => {
    const fields = fieldsOf('<span data-options="Left|Right" data-slot="hero.align"></span>', "hero");
    expect(fields[0]).toMatchObject({ key: "align", type: "select", options: ["Left", "Right"] });
  });

  it("collapses indexed slots into one list, keeping every item's keys", () => {
    const html = `
      <h3 data-slot="menu.items.0.title">A</h3>
      <p data-slot="menu.items.0.body">a</p>
      <h3 data-slot="menu.items.1.title">B</h3>
      <span data-slot="menu.items.1.price">2</span>`;
    const list = fieldsOf(html, "menu").find((f) => f.key === "items");

    expect(list?.type).toBe("list");
    expect(list?.itemSchema?.map((f) => f.key)).toEqual(["title", "body", "price"]);
  });

  it("pins site-wide chrome last, so the panel opens on the page itself", () => {
    // `site.name` sits in the header, so document order alone would lead the panel with it.
    const { schema } = draftContentSchema(read("index.html"));
    expect(schema.sections.map((s) => s.key)).toEqual(["hero", "menu", "hours", "site"]);
  });

  it("refuses a slot with no section, and a slot nested too deep", () => {
    expect(draftContentSchema('<h1 data-slot="headline">x</h1>').issues.join(" ")).toContain(
      "needs a section",
    );
    expect(
      draftContentSchema('<h1 data-slot="a.b.c.d.e">x</h1>').issues.join(" "),
    ).toContain("nests too deep");
  });

  it("says so when there is nothing editable at all", () => {
    expect(draftContentSchema("<h1>Hello</h1>").issues.join(" ")).toContain("no editable slots");
  });
});

// The library has two roads in: blueprints generate their markup and schema together, and
// the normaliser reads a schema back out of markup it did not write. They have to agree, or
// a sourced design and a generated one would edit differently in the same content panel.
describe("blueprint / normaliser parity", () => {
  it("re-derives every registry template's schema from its own markup", () => {
    for (const template of TEMPLATES) {
      const { schema, issues } = draftContentSchema(template.files["index.html"] ?? "");
      expect(issues, template.id).toEqual([]);

      const shape = (s: typeof schema) =>
        s.sections.map((section) => ({
          key: section.key,
          fields: section.fields.map((field) => ({
            key: field.key,
            type: field.type,
            items: field.itemSchema?.map((item) => ({ key: item.key, type: item.type })),
          })),
        }));

      expect(shape(schema), `${template.id}: drafted schema differs from the authored one`)
        .toEqual(shape(template.contentSchema));
    }
  });
});
