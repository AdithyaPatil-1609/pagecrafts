import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ContentSchema } from "@/lib/contracts";
import { TEMPLATES } from "@/lib/templates";
import { checkConventions } from "@/lib/templates/conventions";
import { normaliseTemplate, type SourceTemplate } from "@/lib/templates/normalise";

// The conventions this file enforces are written out, with the reasoning, in
// docs/content-schema-conventions.md. Keep the two together: a rule here that is not in the
// document is a rule nobody agreed to, and a rule there with no test is a rule that drifts.
const DOC = join(process.cwd(), "docs", "content-schema-conventions.md");
const SOURCE_DIR = join(process.cwd(), "data", "templates", "sources", "cafe");

function section(key: string, fields: ContentSchema["sections"][number]["fields"]): ContentSchema {
  return { sections: [{ key, label: "Group", fields }] };
}

describe("the conventions document", () => {
  it("exists and is the reference the checker points at (D4 deliverable)", () => {
    const doc = readFileSync(DOC, "utf8");

    expect(doc).toContain("content_schema authoring conventions");
    expect(doc).toContain("conventions.ts");
    expect(doc).toContain("data-slot");
  });
});

describe("every template follows the conventions", () => {
  // The D4 acceptance asks for two. The library is held to it whole, which is the only
  // version of this rule that survives the grind to 25.
  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s", (_id, template) => {
    expect(checkConventions(template.contentSchema)).toEqual([]);
  });

  it("the worked source example follows them too, straight out of the normaliser", () => {
    const read = (file: string) => readFileSync(join(SOURCE_DIR, file), "utf8");
    const result = normaliseTemplate({
      ...(JSON.parse(read("template.json")) as SourceTemplate),
      files: { "index.html": read("index.html"), "styles.css": read("styles.css") },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(checkConventions(result.template.contentSchema)).toEqual([]);
  });
});

describe("checkConventions catches what would force a special case into the panel", () => {
  it("rejects a key that is not lower snake_case", () => {
    const issues = checkConventions(
      section("hero", [{ key: "Heading_1", label: "Heading", type: "text", maxLength: 60 }]),
    );
    expect(issues.join(" ")).toContain("lower snake_case");
  });

  it("rejects an unlabelled field", () => {
    const issues = checkConventions(
      section("hero", [{ key: "headline", label: "  ", type: "text", maxLength: 60 }]),
    );
    expect(issues.join(" ")).toContain("needs a label");
  });

  it("rejects an uncapped text field", () => {
    const issues = checkConventions(section("hero", [{ key: "headline", label: "H", type: "text" }]));
    expect(issues.join(" ")).toContain("must declare maxLength");
  });

  it("rejects a capped rich-text field", () => {
    const issues = checkConventions(
      section("about", [{ key: "body", label: "Body", type: "richtext", maxLength: 200 }]),
    );
    expect(issues.join(" ")).toContain("do not cap it");
  });

  it("rejects maxLength on a field where it means nothing", () => {
    const issues = checkConventions(
      section("hero", [{ key: "image", label: "Image", type: "image", maxLength: 40 }]),
    );
    expect(issues.join(" ")).toContain("means nothing");
  });

  it("rejects a select with fewer than two options", () => {
    const issues = checkConventions(
      section("hero", [{ key: "align", label: "Align", type: "select", options: ["Left"] }]),
    );
    expect(issues.join(" ")).toContain("at least two options");
  });

  it("rejects a list with no item shape", () => {
    const issues = checkConventions(section("menu", [{ key: "items", label: "Items", type: "list" }]));
    expect(issues.join(" ")).toContain("needs an itemSchema");
  });

  it("rejects a list inside a list", () => {
    const issues = checkConventions(
      section("menu", [
        {
          key: "items",
          label: "Items",
          type: "list",
          itemSchema: [{ key: "extras", label: "Extras", type: "list", itemSchema: [] }],
        },
      ]),
    );
    expect(issues.join(" ")).toContain("cannot nest inside a list");
  });

  it("rejects rich text inside a card", () => {
    const issues = checkConventions(
      section("menu", [
        {
          key: "items",
          label: "Items",
          type: "list",
          itemSchema: [{ key: "body", label: "Body", type: "richtext" }],
        },
      ]),
    );
    expect(issues.join(" ")).toContain("a card, not a column");
  });

  it("rejects a duplicate field key", () => {
    const issues = checkConventions(
      section("hero", [
        { key: "headline", label: "One", type: "text", maxLength: 60 },
        { key: "headline", label: "Two", type: "text", maxLength: 60 },
      ]),
    );
    expect(issues.join(" ")).toContain("duplicate field key");
  });

  it("rejects an empty section, and an empty schema", () => {
    expect(checkConventions(section("hero", [])).join(" ")).toContain("empty heading");
    expect(checkConventions({ sections: [] }).join(" ")).toContain("at least one section");
  });

  it("requires the site section to sit last", () => {
    const schema: ContentSchema = {
      sections: [
        { key: "site", label: "Site", fields: [{ key: "name", label: "Site name", type: "text", maxLength: 40 }] },
        { key: "hero", label: "Hero", fields: [{ key: "headline", label: "Headline", type: "text", maxLength: 60 }] },
      ],
    };

    expect(checkConventions(schema).join(" ")).toContain("belongs last");
  });
});
