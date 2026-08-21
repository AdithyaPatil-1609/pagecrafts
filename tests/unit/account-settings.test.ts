import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PREMIUM_PRICE_INR, PRO_PRICE_INR } from "@/lib/payments/pricing";

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
    expect(billing).toContain("Purchases");
    expect(billing).not.toContain('href="/plans"');
    expect(billing).toContain("Cards stay with Razorpay");
    expect(billing).not.toContain("Switch to Starter");
    expect(billing).not.toContain("Rs 249");
    expect(billing).not.toContain("Billing is not live yet");
    expect(privacy).toContain("Download my data");
    expect(privacy).toContain("/api/v1/account/export");
  });

  it("sends the sidebar to designs, not a User Plan page", () => {
    const sidebar = read("src", "components", "app", "AppSidebar.tsx");
    const publish = read("src", "components", "editor", "PublishCheckoutButton.tsx");

    expect(sidebar).toContain('href="/templates"');
    expect(sidebar).toContain("Browse designs");
    expect(sidebar).not.toContain("UpgradeToProButton");
    expect(sidebar).not.toContain("See plans");
    expect(sidebar).not.toContain("Billing is not live yet");
    expect(publish).toContain("openCheckout");
    expect(publish).toContain("checkout");
  });

  it("puts email notices on the username menu, not a plan upgrade", () => {
    const menu = read("src", "components", "settings", "ProfileMenu.tsx");
    const header = read("src", "components", "landing", "SiteHeader.tsx");
    const remove = read("src", "components", "settings", "DeleteAccount.tsx");

    expect(header).toContain("<ProfileMenu");
    expect(header).not.toContain("PlansNavLink");
    expect(menu).not.toContain("Current plan");
    expect(menu).not.toContain('href="/plans"');
    expect(menu).toContain("/api/v1/account");
    expect(menu).toContain("Email notices");
    expect(menu).toContain('href="/?slide=settings"');
    expect(menu).toContain("scrollIntoView");
    expect(menu).toContain("LogoutButton");
    expect(menu).toContain("cursor-pointer");
    expect(menu).not.toContain("openProCheckout");
    expect(menu).not.toContain("Upgrade to Pro");
    expect(menu).not.toContain("Rs 249");
    expect(remove).toContain("templates or looks you bought will be lost");
    expect(remove).toContain("Enter your password");
    expect(remove).toContain("variant=\"destructive\"");
    expect(remove).toContain("password");
  });
});

describe("paid designs", () => {
  it("prices Pro tiles at Rs 499 and Premium tiles at Rs 999", () => {
    expect(PRO_PRICE_INR).toBe(499);
    expect(PREMIUM_PRICE_INR).toBe(999);
  });

  it("does not keep a User Plan page", () => {
    const top = read("src", "components", "app", "AppTopBar.tsx");
    const card = read("src", "components", "discovery", "TemplateCard.tsx");
    const cta = read("src", "components", "discovery", "BuyPaidItemCta.tsx");
    const detail = read("src", "components", "discovery", "TemplateDetailModal.tsx");

    expect(top).not.toContain("PlansNavLink");
    expect(top).toContain("<ProfileMenu");
    expect(card).toContain("unlockTemplate");
    expect(card).toContain("TemplateDetailModal");
    expect(detail).toContain("BuyPaidItemCta");
    expect(cta).toContain("Would you like to buy it");
    expect(cta).toContain("Continue to Razorpay");
    expect(cta).toContain("Agree");
  });
});
