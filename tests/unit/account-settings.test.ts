import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("account settings", () => {
  it("keeps notices, billing and privacy on the account slide, not site SEO", () => {
    const slide = read("src", "components", "deck", "SettingsSlide.tsx");
    const billing = read("src", "components", "settings", "BillingPlans.tsx");
    const notices = read("src", "components", "settings", "NotificationPrefs.tsx");
    const privacy = read("src", "components", "settings", "PrivacyAndData.tsx");
    const toggle = read("src", "components", "settings", "PreferenceSwitch.tsx");

    expect(slide).toContain("NotificationPrefs");
    expect(slide).toContain("BillingPlans");
    expect(slide).toContain("PrivacyAndData");
    expect(slide).toContain("in the editor");
    expect(notices).toContain("Website published successfully");
    expect(toggle).toContain('role="switch"');
    expect(toggle).toContain("cursor-pointer");
    expect(toggle).toContain("bg-gold");
    expect(billing).toContain("Billing &amp; Plans");
    expect(billing).toContain('href="/plans"');
    expect(billing).toContain("Cards stay with Razorpay");
    expect(billing).not.toContain("Billing is not live yet");
    expect(privacy).toContain("Download my data");
    expect(privacy).toContain("/api/v1/account/export");
  });

  it("shows Starter, Pro and Premium on the User Plan page", () => {
    const page = read("src", "app", "plans", "page.tsx");
    const grid = read("src", "components", "settings", "UserPlanGrid.tsx");
    const header = read("src", "components", "landing", "SiteHeader.tsx");
    const topbar = read("src", "components", "app", "AppTopBar.tsx");

    expect(page).toContain("User Plan");
    expect(grid).toContain("Starter");
    expect(grid).toContain("Rs 499");
    expect(grid).toContain("Rs 999");
    expect(grid).toContain("openPlanCheckout");
    expect(header).toContain("PlansNavLink");
    expect(header).toContain("<ProfileMenu");
    expect(topbar).toContain("PlansNavLink");
  });

  it("puts plan and email notices on the username menu", () => {
    const menu = read("src", "components", "settings", "ProfileMenu.tsx");
    const header = read("src", "components", "landing", "SiteHeader.tsx");

    expect(header).toContain("<ProfileMenu");
    expect(menu).toContain("Current plan");
    expect(menu).toContain("canUpgradePlan");
    expect(menu).toContain('href="/plans"');
    expect(menu).toContain("Upgrade");
    expect(menu).toContain("/api/v1/account/billing");
    expect(menu).toContain("Email notices");
    expect(menu).toContain('href="/settings"');
    expect(menu).toContain("LogoutButton");
    expect(menu).toContain("cursor-pointer");
  });
});
