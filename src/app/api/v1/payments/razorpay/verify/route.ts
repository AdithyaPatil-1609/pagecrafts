import "server-only";
import type { z } from "zod";

import { withRoute } from "@/lib/kernel/with-route";
import { ok, fail } from "@/lib/errors/respond";
import { paymentVerifySchema } from "@/lib/contracts/schemas";
import { applyVerifiedCheckout } from "@/lib/payments/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = z.infer<typeof paymentVerifySchema>;

// POST /api/v1/payments/razorpay/verify — confirm checkout and grant the entitlement.
//
// Auth is optional on purpose. Razorpay can keep the modal open long enough for the
// session cookie to go stale; requiring a session then showed "sign in again" after a
// successful payment and never unlocked Pro (the webhook was the only grant path).
//
// Trust is the payment signature + the notes we wrote onto the order. Granting here is
// idempotent with the webhook.
export const POST = withRoute<Body>({
    auth: "none",
    schema: paymentVerifySchema,
    handler: async ({ body }) => {
        try {
            const granted = await applyVerifiedCheckout({
                orderId: body.razorpay_order_id,
                paymentId: body.razorpay_payment_id,
                signature: body.razorpay_signature,
            });

            console.info("[payments] checkout verified and granted", {
                orderId: body.razorpay_order_id,
                paymentId: body.razorpay_payment_id,
                kind: granted.kind,
                userId: granted.userId,
            });

            return ok({
                verified: true,
                granted: true,
                kind: granted.kind,
            });
        } catch (error) {
            if (error && typeof error === "object" && "code" in error) {
                const api = error as { code: string; message: string };
                if (api.code === "validation_failed") {
                    console.error("[payments] checkout signature mismatch", {
                        orderId: body.razorpay_order_id,
                        paymentId: body.razorpay_payment_id,
                    });
                    return fail(
                        "validation_failed",
                        "Payment verification failed. Please contact support if you were charged.",
                    );
                }
            }
            throw error;
        }
    },
});
