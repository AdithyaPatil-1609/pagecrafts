import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { capturedPayment, verifyWebhook } from "@/lib/payments/razorpay";
import { grantFromOrderNotes } from "@/lib/payments/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/payments/razorpay/webhook — grant paid entitlements from Razorpay.
//
// Not withRoute: this caller is Razorpay, not a signed-in person, so there is no session to
// require and no envelope worth returning. What replaces authentication is the signature —
// an HMAC of the exact bytes below, which only someone holding the webhook secret can
// produce.
//
// The body is read as text and checked before it is parsed. Parsing and re-serialising
// changes the bytes and the signature would never match again.
//
// Status codes here are addressed to Razorpay, not to a user:
//   400 — the signature is wrong. Do not retry; something is misconfigured or hostile.
//   200 — handled, or not ours to handle. Either way, stop resending.
//   500 — we failed. Please retry; the grant is idempotent, so a repeat is safe.
export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (!verifyWebhook(raw, req.headers.get("x-razorpay-signature"))) {
    console.error("[payments] webhook signature did not verify");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payment = capturedPayment(body);

  // Razorpay sends every event type to one URL. Anything that is not a captured payment is
  // acknowledged and ignored — returning an error would make it retry an event forever.
  if (!payment) return NextResponse.json({ ok: true, ignored: true });

  try {
    const granted = await grantFromOrderNotes(payment.notes);
    console.info(`[payments] ${granted.kind} unlocked`, {
      userId: granted.userId,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Missing notes / wrong kind — not retryable; money moved but we cannot map it.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "validation_failed"
    ) {
      console.error("[payments] captured payment carries no usable notes", {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        reason: message,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    console.error("[payments] could not grant after payment", {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      reason: message,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
