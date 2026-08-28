import type { AccountPlan } from "@/lib/contracts";
import { ACCOUNT_PLAN_LABEL } from "@/lib/contracts";
import {
    FREE_GENERATIONS_PER_PROJECT,
    PREMIUM_GENERATIONS_PER_PROJECT,
    PRO_GENERATIONS_PER_PROJECT,
    STARTER_EDITS_PER_PROJECT,
    PRO_EDITS_PER_PROJECT,
    PREMIUM_EDITS_PER_PROJECT,
} from "@/lib/limits/config";
import { PREMIUM_PRICE_INR, PRO_PRICE_INR } from "@/lib/payments/pricing";

/** Account plans. Prices are rupees, paid once through Razorpay. */
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
    price: "Rs 199",
    description:
      "Get started with all the basics. Pick from Starter designs, use the simple look, and let AI build your site.",
    points: [
      "Build and edit sites with AI",
      "All Starter designs included",
      `${FREE_GENERATIONS_PER_PROJECT} AI builds per site`,
      `${STARTER_EDITS_PER_PROJECT} AI chat edits per site`,
      "Edit freely after going live",
    ],
  },
  pro: {
    name: ACCOUNT_PLAN_LABEL.pro,
    price: `Rs ${PRO_PRICE_INR}`,
    description:
      "One payment. Unlock every Pro design, the photo-rich look, and 5 times more AI power.",
    points: [
      "Everything in Starter",
      "All Pro designs unlocked",
      "Photo-rich look for AI sites",
      `${PRO_GENERATIONS_PER_PROJECT} AI builds per site (5× Starter)`,
      `${PRO_EDITS_PER_PROJECT} AI chat edits per site`,
      "Edit live sites anytime",
    ],
  },
  premium: {
    name: ACCOUNT_PLAN_LABEL.premium,
    price: `Rs ${PREMIUM_PRICE_INR}`,
    description:
      "The best plan. One payment, no auto-renew. Unlock everything — every design and every look.",
    points: [
      "Everything in Pro",
      "All designs — Premium and Pro",
      "Animated look for AI sites",
      `${PREMIUM_GENERATIONS_PER_PROJECT} AI builds per site (15× Starter)`,
      `${PREMIUM_EDITS_PER_PROJECT} AI chat edits per site`,
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

export function generationsLimitForPlan(plan: AccountPlan): number {
  if (plan === "premium") return PREMIUM_GENERATIONS_PER_PROJECT;
  if (plan === "pro") return PRO_GENERATIONS_PER_PROJECT;
  return FREE_GENERATIONS_PER_PROJECT;
}

export function editsLimitForPlan(plan: AccountPlan): number {
  if (plan === "premium") return PREMIUM_EDITS_PER_PROJECT;
  if (plan === "pro") return PRO_EDITS_PER_PROJECT;
  return STARTER_EDITS_PER_PROJECT;
}
