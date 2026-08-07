import type { Template } from "@/lib/contracts";
import { cn } from "@/lib/utils";

// The tier badge. Each tier gets its own weight: free is quiet, premium is solid,
// signature is the brand gradient.
//
// NOTE: the gallery tiles no longer carry this — the grid is deliberately price-free so
// the designs read as designs. That is a knowing deviation from UI Spec §7.5 / Doc 22
// P1-P3, which put the price on the tile before any choice. Price has to reappear before
// anyone can commit to a template: the detail modal (D7) is where this belongs.
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
