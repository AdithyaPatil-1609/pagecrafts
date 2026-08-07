import Link from "next/link";
import { Sparkles } from "lucide-react";

import type { Category, Template } from "@/lib/contracts";
import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import type { SortKey } from "@/lib/discovery/sort";
import { TemplateCard } from "@/components/discovery/TemplateCard";
import { SortSelect } from "@/components/discovery/SortSelect";

// Pinned below the grid in every state, including zero results (D-6, AC-F3-4): there is
// always a way forward from this screen, even when no design matches.
function DesignSomethingNewCard({ index }: { index: number }) {
    return (
        <Link
            href="/new"
            className="group flex flex-col overflow-hidden rounded-xl border border-dashed border-primary/40 bg-card transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
            <div className="relative flex aspect-16/10 flex-col items-center justify-center gap-1.5 px-6 text-center">
                <span
                    aria-hidden
                    className="brand-halo flex size-10 items-center justify-center rounded-full border border-primary/40 bg-accent"
                >
                    <Sparkles className="size-5 text-primary" strokeWidth={1.75} />
                </span>
                <span className="mt-1 text-sm font-semibold text-foreground">
                    Design something new
                </span>
                <span className="text-xs text-muted-foreground">
                    Describe it and we build it
                </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                <span className="flex items-baseline gap-2 text-sm font-medium text-foreground">
                    <span className="font-mono text-xs text-muted-foreground">
                        {String(index).padStart(2, "0")}
                    </span>
                    Start from scratch
                </span>
            </div>
        </Link>
    );
}

export function GalleryGrid({
    templates,
    activeCategory,
    sort,
    preserve,
    personalised,
}: {
    templates: Template[];
    activeCategory?: Category;
    sort: SortKey;
    preserve: Record<string, string>;
    personalised: boolean;
}) {
    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="flex flex-wrap items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
                    {templates.length} design{templates.length === 1 ? "" : "s"}
                    {personalised ? " for you" : " to start from"}
                    {activeCategory && (
                        <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-xs font-medium text-primary">
                            · {CATEGORY_LABELS[activeCategory]}
                        </span>
                    )}
                </h2>
                <SortSelect value={sort} preserve={preserve} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map((template, index) => (
                    <TemplateCard key={template.id} template={template} index={index + 1} />
                ))}
            </div>

            {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No designs match that category yet — start from scratch below, or{" "}
                    <Link
                        href="/templates"
                        className="font-medium text-primary underline underline-offset-4"
                    >
                        see every design
                    </Link>
                    .
                </p>
            )}

            <section className="mt-6 flex flex-col gap-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Want something else?
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <DesignSomethingNewCard index={templates.length + 1} />
                </div>
            </section>

        </div>
    );
}
