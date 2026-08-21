"use client";

import { useCallback, useRef } from "react";

import { useRazorpayCheckout, type CheckoutStatus } from "@/hooks/useRazorpayCheckout";
import { waitForStyleGrant, waitForTemplateGrant } from "@/lib/payments/wait-for-pro";

type Pending = {
    resolve: (ok: boolean) => void;
    reject: (error: Error) => void;
};

type Target =
    | { type: "template"; id: string }
    | { type: "style"; id: string };

/**
 * Open Razorpay for this design or look, then wait until the signed webhook has
 * actually granted it. The browser reporting success is not a grant.
 */
export function useUnlockPaidDesign(): {
    unlockTemplate: (templateId: string) => Promise<boolean>;
    unlockStyle: (styleId: string) => Promise<boolean>;
    status: CheckoutStatus;
    error: string | null;
} {
    const pendingRef = useRef<Pending | null>(null);
    const pendingTargetRef = useRef<Target | null>(null);

    const settle = (ok: boolean, error?: Error) => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (!pending) return;
        if (error) pending.reject(error);
        else pending.resolve(ok);
    };

    const { openTemplateCheckout, openStyleCheckout, status, error } = useRazorpayCheckout({
        onAlreadyGranted: () => settle(true),
        onSuccess: () => {
            const target = pendingTargetRef.current;
            if (!target) {
                settle(true);
                return;
            }
            const wait =
                target.type === "style"
                    ? waitForStyleGrant(target.id)
                    : waitForTemplateGrant(target.id);
            void wait.then((ok) => settle(ok));
        },
        onDismiss: () => settle(false),
        onError: (message) => settle(false, new Error(message)),
    });

    const run = useCallback(
        async (target: Target, open: () => Promise<void>): Promise<boolean> => {
            pendingTargetRef.current = target;
            const result = new Promise<boolean>((resolve, reject) => {
                pendingRef.current = { resolve, reject };
            });
            await open();
            return result;
        },
        [],
    );

    const unlockTemplate = useCallback(
        (templateId: string) =>
            run({ type: "template", id: templateId }, () => openTemplateCheckout(templateId)),
        [openTemplateCheckout, run],
    );

    const unlockStyle = useCallback(
        (styleId: string) => run({ type: "style", id: styleId }, () => openStyleCheckout(styleId)),
        [openStyleCheckout, run],
    );

    return { unlockTemplate, unlockStyle, status, error };
}
