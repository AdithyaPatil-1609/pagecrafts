import type { CSSProperties } from "react";
import { CardIndex } from "@/components/ui/card-index";

const MOVES = [
    {
        title: "Tell us about it",
        body: "Just type what your business does, where it is, and the look you want. No special words needed.",
    },
    {
        title: "Watch it appear",
        body: "Pages, pictures and text show up on screen as we build the site from what you told us.",
    },
    {
        title: "Change and go live",
        body: "Say things like \"make it bigger\" or \"change the colour\". When it looks right, put it online — it is that simple.",
    },
];

export function LandingMoves() {
    return (
        <section id="moves" className="page-slide" aria-labelledby="moves-heading">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6">
                <h2
                    id="moves-heading"
                    data-reveal
                    className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
                >
                    Three moves from idea{" "}
                    <span className="text-bloom-sky">to</span>{" "}
                    <span className="hero-gold">online</span>
                </h2>

                <ul className="grid gap-5 sm:grid-cols-3">
                    {MOVES.map((move, i) => (
                        <li
                            key={move.title}
                            data-reveal
                            style={{ "--reveal": i } as CSSProperties}
                            className="glass-panel card-hover relative flex min-h-[16rem] flex-col overflow-hidden rounded-2xl p-6 sm:p-7"
                        >
                            <CardIndex n={i + 1} />
                            <h3 className="relative z-[1] text-xl font-semibold text-foreground">
                                {move.title}
                            </h3>
                            <p className="relative z-[1] mt-3 text-sm leading-6 text-muted-foreground">
                                {move.body}
                            </p>
                            <span className="card-tick relative z-[1]" aria-hidden />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
