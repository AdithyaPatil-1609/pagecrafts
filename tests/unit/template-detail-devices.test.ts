import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("template detail modal device frames", () => {
  it("shows the phone preview as a portrait handset, not a landscape tile", () => {
    const modal = read("src", "components", "discovery", "TemplateDetailModal.tsx");

    expect(modal).toContain('label: "Phone"');
    expect(modal).toContain('orientation: "portrait"');
    expect(modal).toContain("PORTRAIT_ASPECT");
    expect(modal).toContain("LANDSCAPE_ASPECT");
    expect(modal).toMatch(/label:\s*"Desktop"[\s\S]*orientation:\s*"landscape"/);
    expect(modal).toMatch(/label:\s*"Tablet"[\s\S]*orientation:\s*"landscape"/);
    // Phone must be taller than it is wide (portrait aspect > 1).
    expect(modal).toMatch(/PORTRAIT_ASPECT\s*=\s*19\.5\s*\/\s*9/);
  });
});
