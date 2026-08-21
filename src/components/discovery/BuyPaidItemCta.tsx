"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { PaidBadge } from "@/lib/payments/pricing";

export function BuyPaidItemCta({
    badge,
    priceInr,
    kind = "design",
    busy,
    error,
    onBuy,
}: {
    badge: PaidBadge;
    priceInr: number;
    kind?: "design" | "look";
    busy: boolean;
    error: string | null;
    onBuy: () => void;
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    function dismissConfirm() {
        if (busy) return;
        setConfirmOpen(false);
    }

    function agreeAndPay() {
        setConfirmOpen(false);
        onBuy();
    }

    return (
        <>
            <div className="flex w-full flex-wrap items-center justify-end gap-3">
                <div className="mr-auto flex min-w-0 flex-col gap-0.5">
                    <p className="text-base font-semibold text-foreground">
                        This is a {badge} {kind}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This is Rs {priceInr}. Would you like to buy it?
                    </p>
                    {error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                </div>
                <Button
                    type="button"
                    variant="brand"
                    size="lg"
                    className="min-h-11 cursor-pointer font-semibold"
                    disabled={busy}
                    onClick={() => setConfirmOpen(true)}
                >
                    {busy ? "Opening Razorpay…" : "Buy"}
                </Button>
            </div>

            <Dialog
                open={confirmOpen}
                onOpenChange={(next) => {
                    if (!next) dismissConfirm();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Continue to Razorpay?</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            You&apos;ll be taken to Razorpay to pay for this {kind}. Agree only if
                            you want to continue.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 cursor-pointer"
                            disabled={busy}
                            onClick={dismissConfirm}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="brand"
                            className="min-h-11 cursor-pointer"
                            disabled={busy}
                            onClick={agreeAndPay}
                        >
                            Agree
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
