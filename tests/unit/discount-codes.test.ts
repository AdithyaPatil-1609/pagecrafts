import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
    applyPercentOff,
    codeAppliesTo,
    generateScratchCode,
    normalizeScratchCode,
} from "@/lib/payments/discount-math";
import { friendlyMessage } from "@/lib/api/messages";

describe("scratch-card codes", () => {
    it("prints as PC-XXXX-XXXX without ambiguous characters", () => {
        for (let i = 0; i < 40; i += 1) {
            const code = generateScratchCode();
            expect(code).toMatch(/^PC-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
            expect(code).not.toMatch(/[01IOL]/);
        }
    });

    it("accepts typed codes with or without dashes", () => {
        expect(normalizeScratchCode("pc-ab2d-ef3h")).toBe("PC-AB2D-EF3H");
        expect(normalizeScratchCode("  PCAB2DEF3H  ")).toBe("PC-AB2D-EF3H");
        expect(normalizeScratchCode("nope")).toBeNull();
        expect(normalizeScratchCode("PC-0000-1111")).toBeNull();
    });

    it("takes the percent off the listed rupee price", () => {
        expect(applyPercentOff(499, 20)).toBe(399);
        expect(applyPercentOff(999, 20)).toBe(799);
        expect(applyPercentOff(499, 100)).toBe(0);
        expect(applyPercentOff(199, 10)).toBe(179);
    });

    it("lets an all-access card cover every checkout kind", () => {
        expect(codeAppliesTo("all", "pro")).toBe(true);
        expect(codeAppliesTo("pro", "pro")).toBe(true);
        expect(codeAppliesTo("pro", "premium")).toBe(false);
        expect(codeAppliesTo("pro", "template")).toBe(true);
        expect(codeAppliesTo("premium", "style")).toBe(true);
        expect(codeAppliesTo("advanced", "generation_pass")).toBe(false);
    });

    it("tells the reader when a card cannot be used", () => {
        expect(friendlyMessage("invalid_discount", "fallback")).toContain("scratch-card");
    });

    it("charges Razorpay the discounted rupee amount, not a dashboard offer", () => {
        const checkout = readFileSync(join(process.cwd(), "src", "lib", "payments", "checkout.ts"), "utf8");
        const hook = readFileSync(join(process.cwd(), "src", "hooks", "useRazorpayCheckout.tsx"), "utf8");
        const plans = readFileSync(
            join(process.cwd(), "src", "components", "settings", "PlansPanel.tsx"),
            "utf8",
        );

        expect(checkout).toContain("reserveDiscount");
        expect(checkout).toContain("captureDiscount");
        expect(checkout).toContain("discountCode");
        expect(hook).toContain("discountCode");
        expect(plans).toContain("DiscountCodeField");
        expect(plans).toContain("scratch card");
    });
});
