"use client";

import { useCallback, useRef, useState } from "react";
import { Check } from "lucide-react";

import type { AccountPlan, BillingSummary } from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api/client";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { PLAN_COPY } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";

const ORDER: AccountPlan[] = ["starter", "pro", "premium"];

export function UserPlanGrid({
  initial,
  prefill,
}: {
  initial: BillingSummary;
  prefill: { name?: string; email?: string };
}) {
  const [billing, setBilling] = useState<BillingSummary>(initial);
  const [target, setTarget] = useState<"pro" | "premium" | null>(null);
  const pendingPlan = useRef<"pro" | "premium" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await apiGet<BillingSummary>("/api/v1/account/billing");
    if (error || !data) return null;
    setBilling(data);
    return data;
  }, []);

  const waitForPlan = useCallback(
    async (wanted: "pro" | "premium") => {
      for (let i = 0; i < 8; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const next = await refresh();
        if (next?.plan === wanted) {
          setNote(null);
          setTarget(null);
          pendingPlan.current = null;
          return;
        }
      }
      setNote(
        "Payment confirmed. Your plan appears here once Razorpay confirms it to us — usually a few seconds.",
      );
    },
    [refresh],
  );

  const { openPlanCheckout, status, error } = useRazorpayCheckout({
    prefill,
    onAlreadyGranted: () => {
      void refresh();
    },
    onSuccess: () => {
      const wanted = pendingPlan.current;
      if (wanted) void waitForPlan(wanted);
    },
  });

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
  const busy =
    status === "loading" || status === "open" || status === "verifying" || switching;

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {ORDER.map((id) => {
          const option = PLAN_COPY[id];
          const current = plan === id;
          const highlighted = id === "pro";
          let action: { label: string; onClick?: () => void; disabled: boolean } | null = null;

          if (id === "starter") {
            action = current
              ? { label: "Current plan", disabled: true }
              : {
                  label: switching ? "Switching…" : "Switch to Starter",
                  onClick: () => void switchToStarter(),
                  disabled: busy,
                };
          } else if (id === "pro") {
            if (plan === "premium") {
              action = { label: "Included in Premium", disabled: true };
            } else if (current) {
              action = { label: "Current plan", disabled: true };
            } else {
              action = {
                label:
                  target === "pro" && (status === "loading" || status === "open")
                    ? "Opening Razorpay…"
                    : target === "pro" && status === "verifying"
                      ? "Confirming…"
                      : "Choose Pro",
                onClick: () => {
                  pendingPlan.current = "pro";
                  setTarget("pro");
                  setNote(null);
                  void openPlanCheckout("pro");
                },
                disabled: busy,
              };
            }
          } else if (current) {
            action = { label: "Current plan", disabled: true };
          } else {
            action = {
              label:
                target === "premium" && (status === "loading" || status === "open")
                  ? "Opening Razorpay…"
                  : target === "premium" && status === "verifying"
                    ? "Confirming…"
                    : "Choose Premium",
              onClick: () => {
                pendingPlan.current = "premium";
                setTarget("premium");
                setNote(null);
                void openPlanCheckout("premium");
              },
              disabled: busy,
            };
          }

          return (
            <article
              key={id}
              className={cn(
                "flex flex-col rounded-2xl glass-panel p-5",
                current && "ring-2 ring-gold/70",
                highlighted && !current && "border-gold/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">{option.name}</h2>
                {highlighted ? (
                  <span className="rounded-full border border-gold/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
                {option.price}
                {id !== "starter" ? (
                  <span className="ml-1.5 text-sm font-medium text-muted-foreground">once</span>
                ) : null}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{option.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-foreground">
                {option.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              {action ? (
                <button
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={cn(
                    "mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                    id === "premium" && !current
                      ? "border border-primary/40 bg-primary text-primary-foreground"
                      : id === "pro" && !current
                        ? "border border-gold bg-gold text-gold-foreground"
                        : "border border-border text-foreground",
                  )}
                >
                  {action.label}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-sm leading-6 text-muted-foreground">
        Pro is Rs {billing.proPriceInr} and Premium is Rs {billing.premiumPriceInr}, each paid
        once through Razorpay. They are not auto-renewing subscriptions. Cards stay with Razorpay
        — we never store a card or bank number here.
      </p>

      {!billing.paymentsReady ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This server does not have Razorpay keys yet, so checkout cannot open until they are
          set.
        </p>
      ) : null}

      {status === "error" && error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  );
}
