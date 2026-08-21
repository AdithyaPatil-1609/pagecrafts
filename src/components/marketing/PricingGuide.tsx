import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { AI_PACKAGES, GENERATION_PASS } from "@/lib/payments/packages";
import { TIER_PRICE_INR } from "@/lib/payments/pricing";

export function PricingGuide() {
    const free = AI_PACKAGES.free;
    const advanced = AI_PACKAGES.advanced;

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <header className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                    How pricing works
                </p>
                <h1
                    id="pricing-heading"
                    className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                    Two kinds of price — designs and AI
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    PageCrafts charges for what you unlock, not a monthly plan you forget about.
                    Template tiers and AI packages are separate products — do not mix them up.
                </p>
            </header>

            <aside className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm leading-6">
                <p className="font-semibold text-foreground">Keep these apart</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    <li>
                        <span className="text-foreground">Starter / Pro / Premium</span> — which
                        design or AI look you use (paid once per design when locked)
                    </li>
                    <li>
                        <span className="text-foreground">Free / Advanced</span> — how many times
                        you can ask AI to create or regenerate a site
                    </li>
                </ul>
            </aside>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">1. Template & look pricing</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                    Catalogue designs and generated looks use the same three tiers. You pay once to
                    unlock that design for your account — publishing a free design stays free.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                    <article className="rounded-2xl border border-border p-4">
                        <p className="text-sm font-medium text-muted-foreground">Starter</p>
                        <p className="mt-1 text-2xl font-bold">Rs {TIER_PRICE_INR.free}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Sidebar chrome, simple image hero, every page in the nav.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-border p-4">
                        <p className="text-sm font-medium text-muted-foreground">Pro</p>
                        <p className="mt-1 text-2xl font-bold">Rs {TIER_PRICE_INR.premium}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Blended top bar, separate photo-led pages, richer layouts.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-border p-4">
                        <p className="text-sm font-medium text-muted-foreground">Premium</p>
                        <p className="mt-1 text-2xl font-bold">Rs {TIER_PRICE_INR.signature}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Liquid continuous scroll, bloom atmosphere, full brand deck.
                        </p>
                    </article>
                </div>
                <Link
                    href="/compare"
                    className={buttonVariants({
                        variant: "outline-brand",
                        className: "rounded-lg font-semibold",
                    })}
                >
                    See Starter vs Pro vs Premium
                    <ArrowRight aria-hidden />
                </Link>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">2. AI generation pricing</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                    Each AI generation invents three looks (Starter, Pro, Premium). The Free and
                    Advanced packages only change how many generations you get per site — not which
                    look you may buy.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-border p-4">
                        <p className="text-sm font-medium text-muted-foreground">{free.name}</p>
                        <p className="mt-1 text-2xl font-bold">Rs {free.priceInr}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{free.blurb}</p>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {free.features.map((f) => (
                                <li key={f}>{f}</li>
                            ))}
                        </ul>
                    </article>
                    <article className="rounded-2xl border border-border p-4">
                        <p className="text-sm font-medium text-muted-foreground">{advanced.name}</p>
                        <p className="mt-1 text-2xl font-bold">Rs {advanced.priceInr}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{advanced.blurb}</p>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {advanced.features.map((f) => (
                                <li key={f}>{f}</li>
                            ))}
                        </ul>
                    </article>
                </div>
                <p className="text-sm text-muted-foreground">
                    After Advanced is exhausted:{" "}
                    <span className="font-medium text-foreground">
                        {GENERATION_PASS.name} · Rs {GENERATION_PASS.priceInr}
                    </span>{" "}
                    — one more round with three looks.
                </p>
                <Link
                    href="/packages"
                    className={buttonVariants({
                        variant: "brand",
                        className: "rounded-lg font-semibold",
                    })}
                >
                    Open AI Packages
                    <ArrowRight aria-hidden />
                </Link>
            </section>
        </div>
    );
}
