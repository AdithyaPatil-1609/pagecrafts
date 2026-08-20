import type { CSSProperties } from "react";
import Link from "next/link";
import { CardIndex } from "@/components/ui/card-index";
import { buttonVariants } from "@/components/ui/button";

const SHOP = "Meera's Sweets";

const FINISHES = [
    {
        look: "Starter",
        price: "Free",
        badge: null as string | null,
        featured: false,
        preview: "casual" as const,
        body: `${SHOP} gets a friendly shopfront — warm colour, a hero photo, three sweets, and a way to get in touch.`,
        points: ["One photo up top, warm colour", "Simple layout — not a full gallery", "Free to build"],
    },
    {
        look: "Pro",
        price: "Rs 499",
        badge: "Photo-rich",
        featured: true,
        preview: "photos" as const,
        body: "The same shop, art-directed: a warmer palette and stills throughout the page.",
        points: ["Photographs on the page", "A cinematic hero", "Planned Pro look — usable now"],
    },
    {
        look: "Premium",
        price: "Rs 999",
        badge: "Animated",
        featured: false,
        preview: "motion" as const,
        body: "The same words in motion — glow, oversized type, and a kinetic canvas.",
        points: ["Motion drawn from this business", "Scroll and hover that move", "Planned Premium look — usable now"],
    },
];

export function LandingFinishes() {
    return (
        <section id="looks" className="page-slide" aria-labelledby="looks-heading">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2
                        id="looks-heading"
                        data-reveal
                        className="max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
                    >
                        Pick how far the{" "}
                        <span className="text-bloom-sky">magic</span>{" "}
                        <span className="hero-gold">goes</span>
                    </h2>
                    <p className="max-w-xs font-mono text-[10px] uppercase leading-5 tracking-[0.22em] text-muted-foreground">
                        One prompt: “a sweet shop in Indiranagar, Meera&apos;s Sweets” — three finishes
                    </p>
                </div>

                <ul className="grid gap-5 lg:grid-cols-3">
                    {FINISHES.map((finish, i) => (
                        <li
                            key={finish.look}
                            data-reveal
                            style={{ "--reveal": i } as CSSProperties}
                            className={
                                finish.featured
                                    ? "glass-panel card-hover relative flex flex-col overflow-hidden rounded-2xl ring-1 ring-bloom-sky/50 shadow-[0_0_40px_color-mix(in_srgb,var(--bloom-blue)_22%,transparent)]"
                                    : "glass-panel card-hover relative flex flex-col overflow-hidden rounded-2xl"
                            }
                        >
                            <CardIndex n={i + 1} />
                            <FinishPreview kind={finish.preview} />
                            <div className="relative z-[1] flex flex-1 flex-col gap-3 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-foreground">{finish.look}</p>
                                        <p className="mt-0.5 text-sm font-medium text-bloom-sky">{finish.price}</p>
                                    </div>
                                    {finish.badge ? (
                                        <span className="rounded-full border border-signal/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-signal">
                                            {finish.badge}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">{finish.body}</p>
                                <ul className="mt-1 flex flex-col gap-1.5 text-sm text-foreground">
                                    {finish.points.map((point) => (
                                        <li key={point} className="flex gap-2">
                                            <span className="text-signal" aria-hidden>
                                                →
                                            </span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </li>
                    ))}
                </ul>

                <div data-reveal className="flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        All three looks are free to try. You pay Rs 249 only when you go live.
                    </p>
                    <Link
                        href="/new"
                        className={buttonVariants({
                            variant: "outline-brand",
                            className: "rounded-full font-semibold",
                        })}
                    >
                        Build it
                    </Link>
                </div>
            </div>
        </section>
    );
}

function FinishPreview({ kind }: { kind: "casual" | "photos" | "motion" }) {
    if (kind === "casual") {
        return (
            <div className="look-paper relative h-40 px-4 py-4">
                <p className="look-paper-quiet text-[8px] font-semibold uppercase tracking-[0.28em]">
                    Home · Menu · Visit
                </p>
                <p className="mt-4 font-display text-lg font-bold leading-tight">{SHOP}</p>
                <p className="look-paper-muted mt-1 text-[10px]">Handmade sweets, daily.</p>
            </div>
        );
    }

    if (kind === "photos") {
        return (
            <div className="look-photo-hero relative flex h-40 flex-col justify-end px-4 pb-4">
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <p className="relative font-display text-lg font-bold text-white">{SHOP}</p>
                <p className="relative text-[10px] text-white/80">Handmade sweets, daily.</p>
            </div>
        );
    }

    return (
        <div className="look-motion relative flex h-40 flex-col justify-end overflow-hidden px-4 pb-4">
            <span className="look-aurora pointer-events-none absolute -right-6 top-0 size-28 rounded-full" />
            <p className="relative font-display text-lg font-bold leading-tight text-white">
                Handmade sweets, melting <span className="hero-gold">into motion.</span>
            </p>
        </div>
    );
}
