"use client";

import { useState } from "react";
import Link from "next/link";

import type { AccountResponse, BillingHistoryItem, BillingSummary } from "@/lib/contracts";
import { apiPost } from "@/lib/api/client";
import { planName } from "@/lib/payments/plans";

function historyLine(item: BillingHistoryItem): string {
  const when = new Date(item.grantedAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const what =
    item.kind === "premium"
      ? "Premium"
      : item.kind === "pro"
        ? "Pro"
        : item.kind === "publish"
          ? "Publish"
          : "Unlock";
  const how = item.source === "paid" ? "paid" : item.source === "launch_offer" ? "launch offer" : "Pro";
  const state = item.status === "active" ? "" : ` · ${item.status}`;
  return `${what} · ${how} · ${when}${state}`;
}

export function BillingPlans({
  initial,
}: {
  account: AccountResponse;
  initial: BillingSummary;
}) {
  const [billing, setBilling] = useState<BillingSummary>(initial);
  const [note, setNote] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  async function switchToStarter() {
    setSwitching(true);
    setNote(null);
    const { data, error: downError } = await apiPost<BillingSummary>(
      "/api/v1/account/billing/downgrade",
      {},
    );
    if (downError || !data) {
      setNote(downError ?? "Could not switch to Starter.");
    } else {
      setBilling(data);
    }
    setSwitching(false);
  }

  const plan = billing.plan;
  const planLabel = planName(plan);
  const history = billing.history;
  const paidLines = history.filter((item) => item.source === "paid");

  return (
    <div className="rounded-2xl glass-panel p-5">
      <p className="text-base font-semibold text-foreground">
        Billing &amp; Plans — {planLabel}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        Starter is free. Pro is Rs {billing.proPriceInr}. Premium is Rs {billing.premiumPriceInr}.
        Paid plans are one Razorpay payment, not an auto-renewing subscription. Cards stay with
        Razorpay — we never store a card or bank number here.
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">Current plan</dt>
          <dd className="font-medium text-foreground">{planLabel}</dd>
        </div>
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">Payment history</dt>
          <dd className="text-right text-muted-foreground">
            {history.length === 0 ? (
              "No payments yet"
            ) : (
              <ul className="space-y-1">
                {history.slice(0, 5).map((item) => (
                  <li key={item.id} className="text-foreground">
                    {historyLine(item)}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">Invoices and receipts</dt>
          <dd className="text-muted-foreground">
            {paidLines.length === 0
              ? "None yet"
              : "Razorpay emails the receipt for each payment"}
          </dd>
        </div>
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">Payment method</dt>
          <dd className="text-muted-foreground">Cards stay with Razorpay</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {plan === "premium" ? null : (
          <Link
            href="/plans"
            className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-primary/40 px-3 text-sm font-semibold text-foreground"
          >
            Upgrade
          </Link>
        )}
        <button
          type="button"
          disabled={switching || plan === "starter"}
          onClick={() => void switchToStarter()}
          className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {switching ? "Switching…" : "Switch to Starter"}
        </button>
      </div>

      {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  );
}
