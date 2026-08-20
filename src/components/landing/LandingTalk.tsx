const SAY = [
    "Make the hero full-bleed",
    "Swap the palette for something warmer",
    "Add a contact form under the menu",
];

export function LandingTalk() {
    return (
        <section id="canvas" className="page-slide" aria-labelledby="canvas-heading">
            <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div data-reveal>
                    <h2
                        id="canvas-heading"
                        className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl"
                    >
                        Editing feels like <span className="hero-mix">talking</span>
                    </h2>
                    <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                        Point at anything on the page and say what you want changed. Keep it or
                        throw it away. Nothing is applied until you say so.
                    </p>
                    <ul className="mt-8 flex flex-col gap-2.5">
                        {SAY.map((line) => (
                            <li
                                key={line}
                                className="glass-panel card-hover flex items-center gap-3 rounded-full px-5 py-3 font-mono text-sm text-foreground"
                            >
                                <span className="text-signal" aria-hidden>
                                    →
                                </span>
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>

                <TalkCanvas />
            </div>
        </section>
    );
}

function TalkCanvas() {
    return (
        <div data-reveal className="glass-panel relative overflow-hidden rounded-3xl" aria-hidden>
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <span className="size-2 rounded-full bg-primary/80" />
                <span className="size-2 rounded-full bg-signal" />
                <span className="size-2 rounded-full bg-bloom-sky" />
                <span className="flex-1 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Live canvas
                </span>
            </div>
            <div className="relative space-y-3 px-5 py-5">
                <div className="h-28 rounded-xl bg-bloom-blue/25 ring-1 ring-bloom-sky/30" />
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-lg bg-muted" />
                    <div className="h-16 rounded-lg bg-signal/70" />
                    <div className="h-16 rounded-lg bg-muted" />
                </div>
                <div className="space-y-2 pt-2">
                    <div className="h-2 w-3/4 rounded-full bg-foreground/15" />
                    <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
                </div>
                <p className="pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
                    ● Rendering section 4 of 6
                </p>
            </div>
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground [writing-mode:vertical-rl] md:block">
                Canvas
            </span>
        </div>
    );
}
