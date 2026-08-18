import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The assistant entry point (/assistant).
//
// There is nothing to unit-test in the page's own logic — it reads projects and links to the
// editor. What is worth pinning down is the contract between the two halves, because they sit
// in different files owned by different people and a silent rename would break the row without
// breaking anything that fails loudly.

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("the assistant hand-off", () => {
  it("links to the editor with the flag the editor actually reads", () => {
    const page = read("src", "app", "assistant", "page.tsx");
    const shell = read("src", "components", "editor", "EditorShell.tsx");

    // Both halves of one agreement: the page writes ?ask=1, the shell opens the panel for it.
    expect(page).toContain("?ask=1");
    expect(shell).toContain("get('ask') === '1'");
  });

  it("sends someone with one site straight there rather than asking a question with one answer", () => {
    const page = read("src", "app", "assistant", "page.tsx");

    expect(page).toContain("sites.length === 1");
    expect(page).toContain("redirect(`/editor/${sites[0].id}?ask=1`)");
  });

  it("gives the sidebar row somewhere to go, and leaves the others alone", () => {
    const sidebar = read("src", "components", "app", "AppSidebar.tsx");

    expect(sidebar).toContain('href: "/assistant"');

    // Domains and Team have nothing behind them. If either ever gains an href, that should be
    // a deliberate change someone had to come here and make.
    expect(sidebar).toMatch(/\{ label: "Domains", icon: Globe \}/);
    expect(sidebar).toMatch(/\{ label: "Team", icon: Users \}/);
  });
});
