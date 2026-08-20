"use client";

import { useCallback, useRef } from "react";

import { useRazorpayCheckout, type CheckoutStatus } from "@/hooks/useRazorpayCheckout";
import { accountCoversPlan, waitForPlanGrant } from "@/lib/payments/wait-for-pro";
import type { PaidPlan } from "@/lib/payments/pricing";

type Pending = {
    resolve: (ok: boolean) => void;
    reject: (error: Error) => void;
};

/**
 * Open Razorpay for the plan this design needs, then wait until the signed webhook has
 * actually granted it. The browser reporting success is not a grant.
 */
export function useUnlockPaidDesign(): {
    unlockIfNeeded: (plan: PaidPlan | null) => Promise<boolean>;
    status: CheckoutStatus;
    error: string | null;
} {
    const pendingRef = useRef<Pending | null>(null);
    const pendingNeedRef = useRef<PaidPlan | null>(null);

    const settle = (ok: boolean, error?: Error) => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (!pending) return;
        if (error) pending.reject(error);
        else pending.resolve(ok);
    };

    const { openPlanCheckout, status, error } = useRazorpayCheckout({
        onAlreadyGranted: () => settle(true),
        onSuccess: () => {
            const need = pendingNeedRef.current;
            if (!need) {
                settle(true);
                return;
            }
            void waitForPlanGrant(need).then((ok) => settle(ok));
        },
        onDismiss: () => settle(false),
        onError: (message) => settle(false, new Error(message)),
    });

    const unlockIfNeeded = useCallback(
        async (plan: PaidPlan | null): Promise<boolean> => {
            if (!plan) return true;
            if (await accountCoversPlan(plan)) return true;

            pendingNeedRef.current = plan;
            const result = new Promise<boolean>((resolve, reject) => {
                pendingRef.current = { resolve, reject };
            });
            await openPlanCheckout(plan);
            return result;
        },
        [openPlanCheckout],
    );

    return { unlockIfNeeded, status, error };
}
