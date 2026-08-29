"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { scrollToDeckSlide } from "@/lib/deck/scroll-to-slide";
import {
    FREE_GENERATIONS_PER_PROJECT,
    PREMIUM_GENERATIONS_PER_PROJECT,
    PRO_GENERATIONS_PER_PROJECT,
} from "@/lib/limits/config";
import { TIER_PRICE_INR } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

const LOOKS = [
    {
        label: "Starter",
        look: "Casual",
        price: TIER_PRICE_INR.free,
        blurb: "All Starter designs and the simple look. Build your site and go live.",
        detail: `${FREE_GENERATIONS_PER_PROJECT} AI builds per site`,
    },
    {
        label: "Pro",
        look: "Photo-rich",
        price: TIER_PRICE_INR.premium,
        blurb: "One payment unlocks every Pro design and the photo-rich look — not one design at a time.",
        detail: `${PRO_GENERATIONS_PER_PROJECT} AI builds per site (5× Starter)`,
    },
    {
        label: "Premium",
        look: "Animated",
        price: TIER_PRICE_INR.signature,
        blurb: "The best unlock: every Premium and Pro design, plus the animated look on AI-built sites.",
        detail: `${PREMIUM_GENERATIONS_PER_PROJECT} AI builds per site (15× Starter)`,
    },
] as const;

/** One public price story: Starter / Pro / Premium plans. */
export function PricingGuide({ signedIn = false }: { signedIn?: boolean }) {
    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <header className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                    Pricing
                </p>
                <h1
                    id="pricing-heading"
                    className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                    Starter, Pro, or <span className="hero-mix">Premium</span>
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    No monthly fees. Start with Starter designs and the simple look.
                    Upgrade once to unlock every design in that plan — Pro unlocks all Pro
                    designs; Premium unlocks everything.{" "}
                    <Link
                        href="/plans"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        See Plans
                    </Link>
                    .
                </p>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    AI build limits depend on your plan: Starter gets {FREE_GENERATIONS_PER_PROJECT}{" "}
                    builds per site, Pro gets 5 times that, Premium gets 15 times.
                </p>
            </header>

            <section className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    {LOOKS.map((item) => (
                        <article
                            key={item.label}
                            className="rounded-2xl border border-border p-4"
                        >
                            <p className="text-sm font-medium text-muted-foreground">
                                {item.label} · {item.look}
                            </p>
                            <p className="mt-1 text-2xl font-bold">
                                Rs {item.price}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {item.blurb}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground/90">{item.detail}</p>
                        </article>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => scrollToDeckSlide("compare")}
                    className={cn(
                        buttonVariants({
                            variant: "outline-brand",
                            className: "rounded-lg font-semibold",
                        }),
                    )}
                >
                    Starter vs Pro vs Premium
                    <ArrowRight aria-hidden />
                </button>
            </section>

            {signedIn ? (
                <p className="text-sm text-muted-foreground">
                    Need more AI builds on a site?{" "}
                    <Link
                        href="/plans"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        Upgrade your plan
                    </Link>
                    .
                </p>
            ) : null}
        </div>
    );
}
