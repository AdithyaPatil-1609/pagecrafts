import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { canUpgradePlan } from "@/lib/contracts";
import { PREMIUM_PRICE_INR, PRO_PRICE_INR } from "@/lib/payments/pricing";
import { PLAN_COPY, PLAN_PRICE_INR } from "@/lib/payments/plans";

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
    expect(billing).toContain("Switch to Starter");
    expect(billing).not.toContain("Rs 249");
    expect(billing).not.toContain("Billing is not live yet");
    expect(privacy).toContain("Download my data");
    expect(privacy).toContain("/api/v1/account/export");
  });

  it("sends Settings and the sidebar to the User Plan page", () => {
    const sidebar = read("src", "components", "app", "AppSidebar.tsx");
    const upgrade = read("src", "components", "settings", "UpgradeToProButton.tsx");
    const publish = read("src", "components", "editor", "PublishCheckoutButton.tsx");

    expect(sidebar).toContain("UpgradeToProButton");
    expect(sidebar).toContain("Rs 499");
    expect(sidebar).toContain("Rs 999");
    expect(sidebar).not.toContain("Billing is not live yet");
    expect(upgrade).toContain('href="/plans"');
    expect(publish).toContain("openCheckout");
    expect(publish).toContain("checkout");
  });

  it("puts plan and email notices on the username menu", () => {
    const menu = read("src", "components", "settings", "ProfileMenu.tsx");
    const header = read("src", "components", "landing", "SiteHeader.tsx");

    expect(header).toContain("<ProfileMenu");
    expect(header).toContain("PlansNavLink");
    expect(menu).toContain("Current plan");
    expect(menu).toContain("canUpgradePlan");
    expect(menu).toContain("/api/v1/account/billing");
    expect(menu).toContain("Email notices");
    expect(menu).toContain('href="/settings"');
    expect(menu).toContain("LogoutButton");
    expect(menu).toContain("Upgrade");
    expect(menu).toContain('href="/plans"');
    expect(menu).toContain("cursor-pointer");
    expect(menu).not.toContain("openProCheckout");
    expect(menu).not.toContain("Upgrade to Pro");
    expect(menu).not.toContain("Rs 249");
  });
});

describe("the User Plan page", () => {
  it("shows Starter, Pro at Rs 499 and Premium at Rs 999", () => {
    expect(PRO_PRICE_INR).toBe(499);
    expect(PREMIUM_PRICE_INR).toBe(999);
    expect(PLAN_PRICE_INR.pro).toBe(499);
    expect(PLAN_PRICE_INR.premium).toBe(999);
    expect(PLAN_COPY.starter.name).toBe("Starter");
    expect(PLAN_COPY.pro.price).toBe("Rs 499");
    expect(PLAN_COPY.premium.price).toBe("Rs 999");
    expect(PLAN_COPY.starter.description.length).toBeGreaterThan(40);
    expect(PLAN_COPY.pro.description.length).toBeGreaterThan(40);
    expect(PLAN_COPY.premium.description.length).toBeGreaterThan(40);
    expect(PLAN_COPY.pro.description).toMatch(/Razorpay/);
    expect(PLAN_COPY.premium.description).toMatch(/Razorpay/);
  });

  it("lives at /plans, auth-gated, with checkout on the grid", () => {
    const page = read("src", "app", "plans", "page.tsx");
    const layout = read("src", "app", "plans", "layout.tsx");
    const grid = read("src", "components", "settings", "UserPlanGrid.tsx");
    const top = read("src", "components", "app", "AppTopBar.tsx");
    const link = read("src", "components", "settings", "PlansNavLink.tsx");

    expect(layout).toContain('redirect(`/signin?next=${encodeURIComponent(AFTER_SIGN_IN)}`)');
    expect(layout).toContain('"/plans"');
    expect(page).toContain("<UserPlanGrid");
    expect(page).toContain("User Plan");
    expect(page).not.toContain("SEO");
    expect(page).not.toContain("domain");
    expect(grid).toContain("openPlanCheckout");
    expect(grid).toContain("cursor-pointer");
    expect(grid).toContain("Cards stay with Razorpay");
    expect(top).toContain("<PlansNavLink");
    expect(top).toContain("<ProfileMenu");
    expect(link).toContain('href="/plans"');
    expect(link).toContain("cursor-pointer");
    expect(link).toContain("min-h-9");
  });

  it("shows Upgrade on Starter and Pro, and hides it on Premium", () => {
    expect(canUpgradePlan("starter")).toBe(true);
    expect(canUpgradePlan("pro")).toBe(true);
    expect(canUpgradePlan("premium")).toBe(false);
  });
});
