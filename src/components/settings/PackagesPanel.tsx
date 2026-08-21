"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { waitForAdvancedGrant, waitForGenerationPass } from "@/lib/payments/wait-for-pro";
import type { BillingSummary } from "@/lib/contracts";
import { AI_PACKAGES, GENERATION_PASS } from "@/lib/payments/packages";
import { cn } from "@/lib/utils";

export function PackagesPanel({ initial }: { initial: BillingSummary }) {
    const [billing, setBilling] = useState(initial);
    const [message, setMessage] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const { apiGet } = await import("@/lib/api/client");
        const { data } = await apiGet<BillingSummary>("/api/v1/account/billing");
        if (data) setBilling(data);
    }, []);

    const { openAdvancedCheckout, openGenerationPassCheckout, status, error } =
        useRazorpayCheckout({
            onAlreadyGranted: () => {
                setMessage("Advanced is already on this account.");
                void refresh();
            },
            onSuccess: () => {
                setMessage("Payment received. Unlocking…");
            },
            onError: (err) => setMessage(err),
        });

    async function buyAdvanced() {
        setMessage(null);
        await openAdvancedCheckout();
        const ok = await waitForAdvancedGrant();
        if (ok) {
            setMessage("Advanced is active — you now get 30 AI generations per site.");
            await refresh();
        } else {
            setMessage(
                "Payment went through. If Advanced is not showing yet, refresh in a moment.",
            );
            await refresh();
        }
    }

    async function buyPass() {
        setMessage(null);
        const before = billing.generationPasses;
        await openGenerationPassCheckout();
        const ok = await waitForGenerationPass(before + 1);
        if (ok) {
            setMessage("Extra generation pass added — use it on any site that has hit its limit.");
            await refresh();
        } else {
            setMessage(
                "Payment went through. If the pass is not showing yet, refresh in a moment.",
            );
            await refresh();
        }
    }

    const free = AI_PACKAGES.free;
    const advanced = AI_PACKAGES.advanced;
    const hasAdvanced = billing.aiPackage === "advanced";
    const busy = status === "loading" || status === "open" || status === "verifying";

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
            <header className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                    AI usage
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Packages
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Free and Advanced control how many times you can ask AI to create or regenerate
                    a site. They are not the same as Starter, Pro, and Premium — those are design
                    tiers for catalogue templates and AI looks.
                </p>
                <aside className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm leading-6 text-foreground">
                    <p className="font-semibold">Two different products</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                        <li>
                            <span className="text-foreground">Free / Advanced</span> — AI generation
                            allowance per site
                        </li>
                        <li>
                            <span className="text-foreground">Starter / Pro / Premium</span> — which
                            template or look you use (paid separately when locked)
                        </li>
                    </ul>
                </aside>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
                <article
                    className={cn(
                        "rounded-2xl border border-border p-5",
                        !hasAdvanced && "ring-2 ring-primary/40",
                    )}
                >
                    <p className="text-sm font-medium text-muted-foreground">{free.name}</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">Rs 0</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{free.blurb}</p>
                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                        {free.features.map((line) => (
                            <li key={line} className="flex gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                    {!hasAdvanced ? (
                        <p className="mt-5 text-sm font-semibold text-foreground">Your current package</p>
                    ) : (
                        <p className="mt-5 text-sm text-muted-foreground">Included for every account</p>
                    )}
                </article>

                <article
                    className={cn(
                        "rounded-2xl border border-border p-5",
                        hasAdvanced && "ring-2 ring-primary/40",
                    )}
                >
                    <p className="text-sm font-medium text-muted-foreground">{advanced.name}</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                        Rs {advanced.priceInr}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{advanced.blurb}</p>
                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                        {advanced.features.map((line) => (
                            <li key={line} className="flex gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                    {hasAdvanced ? (
                        <p className="mt-5 text-sm font-semibold text-foreground">Active on this account</p>
                    ) : (
                        <Button
                            className="mt-5 w-full rounded-lg font-semibold"
                            disabled={!billing.paymentsReady || busy}
                            onClick={() => void buyAdvanced()}
                        >
                            {busy ? "Opening checkout…" : `Upgrade to Advanced · Rs ${advanced.priceInr}`}
                        </Button>
                    )}
                </article>
            </div>

            <section className="rounded-2xl border border-dashed border-border p-5">
                <h2 className="text-lg font-semibold text-foreground">{GENERATION_PASS.name}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {GENERATION_PASS.blurb} Use this after your Free or Advanced allowance on a site
                    is finished.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                    Passes on this account:{" "}
                    <span className="font-semibold text-foreground">{billing.generationPasses}</span>
                </p>
                <Button
                    variant="outline-brand"
                    className="mt-4 rounded-lg font-semibold"
                    disabled={!billing.paymentsReady || busy}
                    onClick={() => void buyPass()}
                >
                    Buy one pass · Rs {GENERATION_PASS.priceInr}
                </Button>
            </section>

            {(message || error) && (
                <p className="text-sm text-muted-foreground" role="status">
                    {error ?? message}
                </p>
            )}

            {!billing.paymentsReady ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    Payments are not configured on this server yet.
                </p>
            ) : null}

            <p className="text-sm text-muted-foreground">
                Looking for catalogue designs?{" "}
                <Link href="/templates" className="font-medium text-foreground underline-offset-4 hover:underline">
                    Browse templates
                </Link>
                .
            </p>
        </div>
    );
}
