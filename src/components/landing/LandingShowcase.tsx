import type { CSSProperties } from "react";
import { CardIndex } from "@/components/ui/card-index";

const SITES = [
    {
        name: "Studio Nord",
        kind: "Agency",
        prompt: "clean, editorial, lots of air",
        stage: "look-nord",
        headline: "Spaces with room to breathe.",
    },
    {
        name: "Ilya Vega",
        kind: "Portfolio",
        prompt: "dark, neon, a bit brutal",
        stage: "look-vega",
        headline: "Work that hits first.",
    },
    {
        name: "Copper & Co",
        kind: "Shop",
        prompt: "warm, amber, friendly",
        stage: "look-copper",
        headline: "Goods made to last.",
    },
];

export function LandingShowcase() {
    return (
        <section id="showcase" className="page-slide" aria-labelledby="showcase-heading">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2
                        id="showcase-heading"
                        data-reveal
                        className="max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
                    >
                        Built by people who{" "}
                        <span className="text-bloom-sky">don&apos;t</span>{" "}
                        <span className="hero-gold">code</span>
                    </h2>
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                        One prompt each
                    </p>
                </div>

                <ul className="grid gap-5 sm:grid-cols-3">
                    {SITES.map((site, i) => (
                        <li
                            key={site.name}
                            data-reveal
                            style={{ "--reveal": i } as CSSProperties}
                            className="glass-panel card-hover relative overflow-hidden rounded-2xl"
                        >
                            <CardIndex n={i + 1} />
                            <div className={`relative h-44 overflow-hidden ${site.stage}`}>
                                <p className="absolute bottom-4 left-4 right-4 font-display text-lg font-bold leading-tight text-white">
                                    {site.headline}
                                </p>
                            </div>
                            <div className="relative z-[1] flex items-start justify-between gap-3 px-4 py-4">
                                <div>
                                    <p className="font-semibold text-foreground">{site.name}</p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                        “{site.prompt}”
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    {site.kind}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
