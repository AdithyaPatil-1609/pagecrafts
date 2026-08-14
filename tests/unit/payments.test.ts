import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

import { inrToPaise, isFree, publishPriceInr } from "@/lib/payments/pricing";
import { capturedPayment, verifyWebhook } from "@/lib/payments/razorpay";

// The gate at publish (R3). Two things carry the weight: the price a person is shown must
// be the price they are charged, and a webhook must be provably from Razorpay before it can
// unlock anything.

describe("pricing", () => {
    it("charges what the tile says", () => {
        expect(publishPriceInr("free")).toBe(0);
        expect(publishPriceInr("premium")).toBe(499);
        expect(publishPriceInr("signature")).toBe(999);
    });

    it("counts in paise, because Razorpay does", () => {
        expect(inrToPaise(499)).toBe(49_900);
        expect(inrToPaise(999)).toBe(99_900);
        // The classic payments bug is being out by a hundred. It can only happen here.
        expect(inrToPaise(publishPriceInr("premium"))).not.toBe(499);
    });

    it("knows when there is nothing to pay", () => {
        expect(isFree("free")).toBe(true);
        expect(isFree("premium")).toBe(false);
    });
});

describe("webhook verification", () => {
    const SECRET = "whsec-test";
    const body = JSON.stringify({ event: "payment.captured" });

    beforeEach(() => {
        vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", SECRET);
        vi.resetModules();
    });

    function sign(payload: string, secret = SECRET) {
        return createHmac("sha256", secret).update(payload).digest("hex");
    }

    it("accepts a body signed with the webhook secret", async () => {
        const { verifyWebhook: verify } = await import("@/lib/payments/razorpay");
        expect(verify(body, sign(body))).toBe(true);
    });

    it("refuses a signature made with the wrong secret", async () => {
        const { verifyWebhook: verify } = await import("@/lib/payments/razorpay");
        expect(verify(body, sign(body, "not-the-secret"))).toBe(false);
    });

    it("refuses a body that changed after it was signed", async () => {
        const { verifyWebhook: verify } = await import("@/lib/payments/razorpay");
        const signature = sign(body);
        expect(verify(JSON.stringify({ event: "payment.failed" }), signature)).toBe(false);
    });

    it("refuses a missing signature outright", async () => {
        // Through the dynamic import like its neighbours: the module reads the secret once,
        // at load, so the copy imported at the top of this file predates stubEnv.
        const { verifyWebhook: verify } = await import("@/lib/payments/razorpay");
        expect(verify(body, null)).toBe(false);
    });
});

describe("reading a webhook body", () => {
    const entity = {
        id: "pay_123",
        order_id: "order_123",
        notes: { projectId: "p_1", userId: "u_1", kind: "publish" },
    };

    it("finds a captured payment and the notes we wrote onto its order", () => {
        const found = capturedPayment({
            event: "payment.captured",
            payload: { payment: { entity } },
        });

        expect(found).toEqual({
            paymentId: "pay_123",
            orderId: "order_123",
            notes: { projectId: "p_1", userId: "u_1", kind: "publish" },
        });
    });

    it("ignores the other events Razorpay sends down the same URL", () => {
        expect(capturedPayment({ event: "payment.failed", payload: { payment: { entity } } })).toBeNull();
        expect(capturedPayment({ event: "order.paid" })).toBeNull();
        expect(capturedPayment({})).toBeNull();
        expect(capturedPayment(null)).toBeNull();
    });

    it("ignores a captured payment with no order to match it to", () => {
        expect(
            capturedPayment({
                event: "payment.captured",
                payload: { payment: { entity: { id: "pay_123" } } },
            }),
        ).toBeNull();
    });
});
