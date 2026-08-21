import type { AccountPlan } from "@/lib/contracts";
import { ACCOUNT_PLAN_LABEL } from "@/lib/contracts";
import { PREMIUM_PRICE_INR, PRO_PRICE_INR } from "@/lib/payments/pricing";

/** Account plans shown on /plans. Prices are rupees, paid once through Razorpay. */
export const PLAN_PRICE_INR: Record<Exclude<AccountPlan, "starter">, number> = {
  pro: PRO_PRICE_INR,
  premium: PREMIUM_PRICE_INR,
};

export const PLAN_COPY: Record<
  AccountPlan,
  { name: string; price: string; description: string; points: string[] }
> = {
  starter: {
    name: ACCOUNT_PLAN_LABEL.starter,
    price: "Free",
    description:
      "The default plan. Describe a site, pick a design, and edit with AI. Free designs go live at no charge; a paid design is billed when you publish that site. AI generations are capped per site.",
    points: [
      "Build and edit sites with AI",
      "Publish free designs at no charge",
      "Pay per paid design when that site goes live",
    ],
  },
  pro: {
    name: ACCOUNT_PLAN_LABEL.pro,
    price: `Rs ${PRO_PRICE_INR}`,
    description:
      "One payment through Razorpay. Publish any design without a separate publish checkout, keep editing after a site is live, and drop the per-site AI cap. Not a subscription — it stays until you change plan.",
    points: [
      "Everything in Starter",
      "Publish any design without a per-site checkout",
      "Unlimited AI generations",
      "Edit live sites after the free window",
    ],
  },
  premium: {
    name: ACCOUNT_PLAN_LABEL.premium,
    price: `Rs ${PREMIUM_PRICE_INR}`,
    description:
      "Everything in Pro, as the top account unlock — for people who publish often or keep several sites. One payment, no auto-renew, same Razorpay checkout.",
    points: [
      "Everything in Pro",
      "The top one-time account unlock",
      "Stays until you change plan",
    ],
  },
};

export function planName(plan: AccountPlan): string {
  return ACCOUNT_PLAN_LABEL[plan];
}

/** Whether this account plan already unlocks the paid design they picked. */
export function planCovers(have: AccountPlan | null | undefined, need: "pro" | "premium"): boolean {
  if (!have || have === "starter") return false;
  if (need === "pro") return have === "pro" || have === "premium";
  return have === "premium";
}
