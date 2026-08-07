import Link from "next/link";

import type { Category, Template } from "@/lib/contracts";
import { CATEGORY_LABELS } from "@/lib/discovery/categories";
import { TemplateCard } from "@/components/discovery/TemplateCard";

// Pinned as the first grid cell in every state, including zero results (D-6, AC-F3-4).
function DesignSomethingNewCard() {
  return (
    <Link
      href="/new"
      className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-card p-4 text-center transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="text-lg font-semibold text-primary">+ Design something new</span>
      <span className="text-sm text-muted-foreground">Describe it and we build it</span>
    </Link>
  );
}

export function GalleryGrid({
  templates,
  activeCategory,
}: {
  templates: Template[];
  activeCategory?: Category;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {templates.length} template{templates.length === 1 ? "" : "s"}
        {activeCategory ? ` · ${CATEGORY_LABELS[activeCategory]}` : ""}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DesignSomethingNewCard />
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No templates match that category yet — start from a blank design above, or{" "}
          <Link href="/templates" className="font-medium text-primary underline underline-offset-4">
            see all templates
          </Link>
          .
        </p>
      )}
    </div>
  );
}
