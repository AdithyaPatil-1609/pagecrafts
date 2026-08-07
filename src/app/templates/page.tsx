import { TEMPLATES } from "@/lib/templates";
import { toCategory } from "@/lib/discovery/categories";
import { GalleryGrid } from "@/components/discovery/GalleryGrid";

// Screen 04 — the gallery. On stub data (the local template registry) for now; wires to
// GET /templates in week 2 (D6). The category from the URL pre-filters the grid, so the
// intent screen's choice carries straight through (D-4). Unknown values are ignored.
export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = toCategory(category);
  const templates = active
    ? TEMPLATES.filter((t) => t.category === active)
    : TEMPLATES;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a design</h1>
        <p className="text-muted-foreground">
          Every design is free to edit — you only pay when you go live.
        </p>
      </header>
      <GalleryGrid templates={templates} activeCategory={active} />
    </main>
  );
}
