import type { AccountPlan, BillingSummary } from "@/lib/contracts";
import { apiGet } from "@/lib/api/client";
import { planCovers } from "@/lib/payments/plans";
import type { PaidPlan } from "@/lib/payments/pricing";

// After Razorpay reports success the entitlement is still not ours until the signed
// webhook lands. The browser must not treat checkout as a grant — it polls billing.

export async function accountPlan(): Promise<AccountPlan | null> {
    const { data } = await apiGet<BillingSummary>("/api/v1/account/billing");
    return data?.plan ?? null;
}

export async function accountCoversPlan(need: PaidPlan): Promise<boolean> {
    return planCovers(await accountPlan(), need);
}

export async function waitForPlanGrant(
    need: PaidPlan,
    options?: { attempts?: number; delayMs?: number },
): Promise<boolean> {
    const attempts = options?.attempts ?? 8;
    const delayMs = options?.delayMs ?? 800;

    if (await accountCoversPlan(need)) return true;

    for (let i = 0; i < attempts; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (await accountCoversPlan(need)) return true;
    }

    return false;
}
