import { CodeXml, Rocket, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Decorative hero illustration: a stylised site preview with the three
 * promises floating off it. Purely presentational — hidden from assistive
 * tech, and from small screens where it would only crowd the copy.
 */

const FLOATING = [
    { icon: Sparkles, label: "AI Generated", position: "left-0 top-[58%]", tilt: "-rotate-6" },
    { icon: Rocket, label: "Instant Launch", position: "left-[36%] top-[72%]", tilt: "rotate-3" },
    { icon: CodeXml, label: "No Code", position: "right-0 top-[44%]", tilt: "rotate-6" },
] satisfies { icon: LucideIcon; label: string; position: string; tilt: string }[];

function Bar({ className }: { className?: string }) {
    return <span className={`block h-2.5 rounded-full bg-border ${className ?? ""}`} />;
}

export function HeroArtwork() {
    return (
        <div aria-hidden className="pointer-events-none relative mt-16 hidden h-90 w-full max-w-2xl sm:block">
            {/* Dot field, bottom left */}
            <svg className="absolute -left-4 top-40 h-24 w-28 text-primary/50" viewBox="0 0 112 96">
                <pattern id="pagecraft-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="2" fill="currentColor" />
                </pattern>
                <rect width="112" height="96" fill="url(#pagecraft-dots)" />
            </svg>

            {/* Site preview window */}
            <div className="absolute left-[10%] top-0 w-[78%] rounded-2xl border border-border bg-card/80 p-4 shadow-2xl backdrop-blur-sm">
                <div className="flex gap-2">
                    <span className="size-3 rounded-full bg-primary" />
                    <span className="size-3 rounded-full bg-muted-foreground/70" />
                    <span className="size-3 rounded-full bg-muted-foreground/40" />
                </div>

                <div className="mt-4 grid grid-cols-[1.7fr_1fr] gap-4">
                    <div className="flex aspect-16/10 items-end justify-center overflow-hidden rounded-xl border border-border bg-accent/60">
                        <svg viewBox="0 0 160 100" className="h-full w-full text-primary">
                            <circle cx="52" cy="34" r="9" fill="currentColor" />
                            <path
                                d="M8 92 L58 46 L88 74 L112 52 L152 92 Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className="flex flex-col justify-center gap-3">
                        <Bar className="w-full" />
                        <Bar className="w-4/5" />
                        <Bar className="w-3/5" />
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 pb-14">
                    <Bar className="w-1/2" />
                    <Bar className="w-2/3" />
                </div>
            </div>

            {/* The three promises, floating over the window */}
            {FLOATING.map(({ icon: Icon, label, position, tilt }) => (
                <div
                    key={label}
                    className={`absolute ${position} ${tilt} flex w-34 flex-col items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-5 text-center shadow-xl backdrop-blur-sm`}
                >
                    <Icon className="size-7 text-primary" strokeWidth={1.75} />
                    <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
            ))}
        </div>
    );
}
