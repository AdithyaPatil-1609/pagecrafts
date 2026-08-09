import type { Template } from "@/lib/contracts";
import { cn } from "@/lib/utils";

// The tier badge styling for template tiers.
const TIER_BADGE: Record<Template["tier"], string> = {
    free: "border border-border bg-background/85 text-foreground backdrop-blur-sm",
    premium: "bg-primary text-primary-foreground",
    signature: "brand-gradient text-primary-foreground",
};

export function PriceBadge({
    template,
    className,
}: {
    template: Template;
    className?: string;
}) {
    const label = template.tier === "free" ? "Free" : `Rs ${template.priceInr}`;

    return (
        <span
            className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                TIER_BADGE[template.tier],
                className,
            )}
        >
            {label}
        </span>
    );
}
