import { cn } from "@/lib/utils";

/** The PageCraft lockup: gold "PC" tile plus the wordmark. */
export function BrandMark({ className }: { className?: string }) {
    return (
        <span className={cn("flex items-center gap-3", className)}>
            <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-xl border border-gold/45 bg-card font-display text-[0.68rem] font-bold tracking-[0.12em] text-gold"
            >
                PC
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
                PageCraft
            </span>
        </span>
    );
}
