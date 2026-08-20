import { cn } from "@/lib/utils";

/** The PageCraft lockup: gradient "P" tile plus the wordmark. */
export function BrandMark({ className }: { className?: string }) {
    return (
        <span className={cn("flex items-center gap-3", className)}>
            <span
                aria-hidden
                className="brand-gradient flex size-9 items-center justify-center rounded-xl text-lg font-bold leading-none text-primary-foreground shadow-[0_4px_20px_var(--brand-glow)]"
            >
                P
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground font-display">
                PageCraft
            </span>
        </span>
    );
}
