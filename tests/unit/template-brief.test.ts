import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("choosing a template", () => {
  it("asks for the business facts before opening the editor", () => {
    const button = read("src", "components", "discovery", "UseDesignButton.tsx");
    const capture = read("src", "components", "discovery", "IntentCapture.tsx");
    const page = read("src", "app", "new", "page.tsx");

    expect(button).toContain("/new?template=");
    expect(button).not.toContain("/editor/");
    expect(page).toContain("sourceTemplateId");
    expect(capture).toContain("startFromDesign");
    expect(capture).toContain("Put this on the design");
  });

  it("keeps the editor as chat on the left and live preview on the right", () => {
    const shell = read("src", "components", "editor", "EditorShell.tsx");
    const defaultSplit = shell.slice(shell.indexOf("lg:flex-[3]"));

    expect(defaultSplit.indexOf("<ChatPanel")).toBeGreaterThan(0);
    expect(defaultSplit.indexOf("<PreviewPane")).toBeGreaterThan(defaultSplit.indexOf("<ChatPanel"));
    expect(shell.includes("ContentPanel")).toBe(false);
  });
});
