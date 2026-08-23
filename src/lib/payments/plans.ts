import type { AccountPlan } from "@/lib/contracts";
import { ACCOUNT_PLAN_LABEL } from "@/lib/contracts";
import {
    FREE_GENERATIONS_PER_PROJECT,
    PREMIUM_GENERATIONS_PER_PROJECT,
    PRO_GENERATIONS_PER_PROJECT,
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
    price: "Free",
    description:
      "Free Starter templates, the Casual look, and a limited number of AI rebuilds per site.",
    points: [
      "All Starter catalogue designs",
      "Casual look on AI-generated sites",
      `${FREE_GENERATIONS_PER_PROJECT} AI generations per site`,
      "Publish free designs at no charge",
    ],
  },
  pro: {
    name: ACCOUNT_PLAN_LABEL.pro,
    price: `Rs ${PRO_PRICE_INR}`,
    description:
      "Unlock every Pro template and the Photo-rich look, with ten times the Starter AI allowance.",
    points: [
      "Everything in Starter",
      "All templates marked Pro",
      "Photo-rich look on AI sites",
      `${PRO_GENERATIONS_PER_PROJECT} AI generations per site (10× Starter)`,
      "Edit live sites after the free window",
    ],
  },
  premium: {
    name: ACCOUNT_PLAN_LABEL.premium,
    price: `Rs ${PREMIUM_PRICE_INR}`,
    description:
      "Unlock every template and the Animated look, with twenty-five times the Starter AI allowance.",
    points: [
      "Everything in Pro",
      "All templates — Premium and Pro",
      "Animated look on AI sites",
      `${PREMIUM_GENERATIONS_PER_PROJECT} AI generations per site (25× Starter)`,
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
