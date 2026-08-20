"use client";

import Link from "next/link";

import type { AccountPlan } from "@/lib/contracts";
import { cn } from "@/lib/utils";

export function UpgradeToProButton({
  className,
  plan = "starter",
}: {
  prefill?: { name?: string; email?: string };
  className?: string;
  plan?: AccountPlan;
}) {
  if (plan === "premium") {
    return (
      <p className="mt-4 text-sm font-semibold text-foreground">You're on Premium</p>
    );
  }

  return (
    <Link
      href="/plans"
      className={cn(
        "mt-4 flex w-full cursor-pointer items-center justify-center rounded-lg border border-primary/40 px-3 py-2 text-sm font-semibold text-brand-ink",
        className,
      )}
    >
      {plan === "pro" ? "Upgrade to Premium" : "See plans"}
    </Link>
  );
}
