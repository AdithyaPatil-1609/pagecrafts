import type { Template } from "@/lib/contracts";
import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import { TemplatePreview } from "@/components/discovery/TemplatePreview";
import { cn } from "@/lib/utils";

// Price shown on the tile itself, before any choice (UI Spec §7.5, Doc 22 P1-P3).
// Each tier gets its own weight: free is quiet, premium is solid, signature is the
// brand gradient — the same ladder the legend under the grid explains.
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

export function TemplateCard({
    template,
    index,
}: {
    template: Template;
    index: number;
}) {
    return (
        <article className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
            <div className="relative">
                {/* Static miniature — never a live iframe (D-3, AC-F3-2). */}
                <TemplatePreview template={template} />
                <PriceBadge template={template} className="absolute right-2.5 top-2.5" />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                <h3 className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-foreground">
                    <span className="font-mono text-xs text-muted-foreground">
                        {String(index).padStart(2, "0")}
                    </span>
                    <span className="truncate">{template.name}</span>
                </h3>
                <span className="shrink-0 text-xs text-muted-foreground">
                    {CATEGORY_LABELS[template.category]}
                </span>
            </div>

            {/* Kept for screen readers and search: the tile itself stays visual. */}
            <p className="sr-only">{template.description}</p>
        </article>
    );
}
