import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("the assistant hand-off", () => {
  it("links to the editor with the flag the editor actually reads", () => {
    const slide = read("src", "components", "deck", "AssistantSlide.tsx");
    const shell = read("src", "components", "editor", "EditorShell.tsx");

    expect(slide).toContain("?ask=1");
    expect(shell).toContain("get('ask') === '1'");
  });

  it("keeps the way in on the home deck rather than bouncing away", () => {
    const slide = read("src", "components", "deck", "BuildSlide.tsx");
    const page = read("src", "app", "assistant", "page.tsx");

    expect(page).toContain('redirect("/?slide=build")');
    expect(slide).not.toContain("redirect(");
  });

  it("puts the home deck on the top bar", () => {
    const header = read("src", "components", "landing", "SiteHeader.tsx");
    const menu = read("src", "components", "settings", "ProfileMenu.tsx");

    expect(header).toContain('href: "/#welcome"');
    expect(header).toContain('href: "/#how-it-works"');
    expect(header).toContain('href: "/#build"');
    expect(header).toContain('href: "/#sites"');
    expect(header).toContain("<ProfileMenu");
    expect(menu).toContain('href="/settings"');
    expect(menu).toContain("LogoutButton");
    const settingsLink = menu
      .split("\n")
      .find((line) => line.includes('href="/settings"'));
    expect(settingsLink).toBeTruthy();
    expect(settingsLink).not.toContain("hidden");
    expect(settingsLink).not.toContain("/#settings");
  });

  it("keeps every signed-in slide reachable instead of clipping it", () => {
    const css = read("src", "app", "globals.css");
    const home = read("src", "app", "(auth)", "page.tsx");
    const how = read("src", "components", "landing", "ValueProps.tsx");
    const build = read("src", "components", "deck", "BuildSlide.tsx");
    const sites = read("src", "components", "deck", "SitesSlide.tsx");
    const settings = read("src", "components", "deck", "SettingsSlide.tsx");
    const flow = read("src", "components", "site", "PageFlow.tsx");

    expect(css).toContain("scroll-snap-type: y proximity");
    expect(css).toContain("isolation: isolate");
    expect(css).toContain("overflow-x: clip");
    expect(home).toContain("<ValueProps />");
    expect(home).toContain("<BuildSlide");
    expect(home).toContain("<SitesSlide");
    expect(home).toContain("<SettingsSlide");
    expect(how).toContain("page-slide-tall");
    expect(how).toContain('id="how-it-works"');
    expect(how).toContain("How it works");
    expect(how).not.toContain("data-reveal");
    expect(build).toContain("Explore more");
    expect(build).toContain('href="/templates"');
    expect(build).toContain("lg:grid-cols-2");
    expect(build).toContain("sm:grid-cols-3");
    expect(build).not.toContain("lg:grid-cols-4");
    expect(build).toContain("IntentCapture");
    expect(build).toContain("library={false}");
    expect(build).not.toContain("data-reveal");
    expect(sites).toContain("Your sites");
    expect(sites).not.toContain("data-reveal");
    expect(settings).toContain("Settings");
    expect(settings).toContain("NotificationPrefs");
    expect(settings).toContain("BillingPlans");
    expect(settings).toContain("PrivacyAndData");
    expect(settings).not.toContain("data-reveal");
    expect(flow).toContain("revealVisible");
  });
});
