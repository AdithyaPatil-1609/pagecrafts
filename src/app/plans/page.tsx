import { UserPlanGrid } from "@/components/settings/UserPlanGrid";
import { supabaseViewerClient } from "@/lib/auth/server";
import { viewer } from "@/lib/auth/session";
import { DEFAULT_BILLING, type BillingSummary } from "@/lib/contracts";
import { getBilling } from "@/lib/payments/checkout";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await viewer();
  if (!user) return null;

  let billing: BillingSummary = DEFAULT_BILLING;
  try {
    const supabase = await supabaseViewerClient();
    billing = await getBilling(supabase, user.id);
  } catch {
    billing = DEFAULT_BILLING;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-ink">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          User Plan
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Starter is free. Pro is Rs 499. Premium is Rs 999. Compare them here — each paid
          plan is one Razorpay payment, not an auto-renewing subscription.
        </p>
      </header>

      <div className="mt-8">
        <UserPlanGrid
          initial={billing}
          prefill={{ name: user.name, email: user.email }}
        />
      </div>
    </main>
  );
}
