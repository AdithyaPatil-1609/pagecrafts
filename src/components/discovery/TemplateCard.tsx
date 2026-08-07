import type { Template } from "@/lib/contracts";
import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import { TemplatePreview } from "@/components/discovery/TemplatePreview";

// The tile is the design and nothing else: a miniature, a number and a name. Price is
// deliberately absent here — see the note in PriceBadge.tsx for where it goes instead.
export function TemplateCard({
    template,
    index,
}: {
    template: Template;
    index: number;
}) {
    return (
        <article className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
            {/* Static miniature — never a live iframe (D-3, AC-F3-2). */}
            <TemplatePreview template={template} />

            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                <h3 className="flex min-w-0 items-baseline gap-2.5 text-sm font-semibold text-foreground">
                    <span className="font-mono text-xs font-normal text-muted-foreground">
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
