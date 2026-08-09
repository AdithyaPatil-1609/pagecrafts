import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import type { TemplateSummary } from "@/lib/templates/query";
import { TemplatePreview } from "@/components/discovery/TemplatePreview";
import { TemplateDetailModal } from "@/components/discovery/TemplateDetailModal";
import { PriceBadge } from "@/components/discovery/PriceBadge";

// A tile: the design, its name, and what it costs.
//
// The whole tile is one button, so opening a design is a single target for a mouse and a
// single stop for a keyboard (the core flow has to be keyboard-completable — D20).
export function TemplateCard({
    template,
    index,
}: {
    template: TemplateSummary;
    index: number;
}) {
    return (
        <article className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 focus-within:border-primary/40">
            <TemplateDetailModal templateId={template.id} templateName={template.name}>
                <button
                    type="button"
                    className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <span className="relative block">
                        {/* Static miniature — never a live iframe (D-3, AC-F3-2). */}
                        <TemplatePreview preview={template.preview} priority={index <= 4} />

                        {/* The price, on the design, before any choice (UI Spec §7.5). */}
                        <PriceBadge
                            tier={template.tier}
                            priceInr={template.priceInr}
                            className="absolute right-2 top-2 shadow-sm"
                        />
                    </span>

                    <span className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                        <span className="flex min-w-0 items-baseline gap-2.5 text-sm font-semibold text-foreground">
                            <span className="font-mono text-xs font-normal text-muted-foreground">
                                {String(index).padStart(2, "0")}
                            </span>
                            <span className="truncate">{template.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {CATEGORY_LABELS[template.category]}
                        </span>
                    </span>

                    {/* Kept for screen readers and search: the tile itself stays visual. */}
                    <span className="sr-only">{template.description}</span>
                </button>
            </TemplateDetailModal>
        </article>
    );
}
