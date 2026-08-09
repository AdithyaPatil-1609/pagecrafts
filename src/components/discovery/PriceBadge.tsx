import type { TemplateTier } from "@/lib/contracts";
import { cn } from "@/lib/utils";

// The tier badge, on the tile itself. Each tier gets its own weight: free is quiet, premium
// is solid, signature is the brand gradient.
//
// It sits on the card from D6 because the price has to be visible before any choice and
// never after it (UI Spec §7.5, §7.18, Doc 22 P1-P3). A grid that shows only designs, then
// names a price once someone has fallen for one, is the pattern the price card exists to
// forbid. The detail modal states it again beside the button that commits.
const TIER_BADGE: Record<TemplateTier, string> = {
    free: "border border-border bg-background/85 text-foreground backdrop-blur-sm",
    premium: "bg-primary text-primary-foreground",
    signature: "brand-gradient text-primary-foreground",
};

export function PriceBadge({
    tier,
    priceInr,
    className,
}: {
    tier: TemplateTier;
    priceInr: number;
    className?: string;
}) {
    // "Free" is a fact about the design; "Rs 0" would be a price on something that has none.
    const label = tier === "free" ? "Free" : `Rs ${priceInr}`;

    return (
        <span
            className={cn(
                "rounded-md px-2 py-0.5 text-xs font-semibold",
                TIER_BADGE[tier],
                className,
            )}
        >
            {label}
        </span>
    );
}
