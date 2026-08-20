import { cn } from "@/lib/utils";

/** Quiet glass windows behind the product — real type, not placeholder bars. */
export function SiteScene({ quiet, soft }: { quiet?: boolean; soft?: boolean }) {
    return (
        <div
            aria-hidden
            className={cn(
                "pointer-events-none fixed inset-0 z-0 overflow-hidden",
                quiet ? "opacity-15" : soft ? "opacity-35" : "opacity-55",
            )}
        >
            <MiniSite
                className="scene-card scene-card-a hidden rotate-[-7deg] sm:block"
                name="Meera's Sweets"
                line="Indiranagar · boxes from Rs 249"
            />
            <MiniSite
                className="scene-card scene-card-b hidden rotate-[6deg] md:block"
                name="Lotus Dental"
                line="Family clinic, Koramangala"
            />
            <MiniSite
                className="scene-card scene-card-c hidden rotate-[-4deg] lg:block"
                name="Harbour Gym"
                line="Open from 5 in the morning"
            />
        </div>
    );
}

function MiniSite({
    className,
    name,
    line,
}: {
    className?: string;
    name: string;
    line: string;
}) {
    return (
        <div className={cn("glass-panel overflow-hidden rounded-2xl", className)}>
            <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2">
                <span className="size-1.5 rounded-full bg-primary/80" />
                <span className="size-1.5 rounded-full bg-signal" />
                <span className="size-1.5 rounded-full bg-bloom-sky" />
            </div>
            <div className="px-4 py-4">
                <p className="font-display text-sm font-semibold text-foreground">{name}</p>
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{line}</p>
                <span className="mt-3 inline-flex rounded-full bg-primary/90 px-2.5 py-1 text-[9px] font-semibold text-primary-foreground">
                    Visit the site
                </span>
            </div>
        </div>
    );
}
