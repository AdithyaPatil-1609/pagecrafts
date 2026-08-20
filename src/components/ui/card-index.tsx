import { cn } from "@/lib/utils";

export function CardIndex({
    n,
    compact = false,
}: {
    n: number | string;
    compact?: boolean;
}) {
    const label = typeof n === "number" ? String(n).padStart(2, "0") : n;

    return (
        <span className={cn("card-index", compact && "card-index-compact")} aria-hidden>
            {label}
        </span>
    );
}
