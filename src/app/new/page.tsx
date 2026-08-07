import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";
import { toCategory } from "@/lib/discovery/categories";
import { IntentCapture } from "@/components/discovery/IntentCapture";

// Screen 03 — "What are you building?" Neither input is required; picking a category or
// describing the site routes to the gallery, and both empty shows every template.
//
// Arriving with `q`/`category` means the user came back from the gallery to edit what
// they said, so the form opens on exactly what it sent — never a blank page.
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">What are you building?</h1>
        <p className="text-muted-foreground">
          Pick a starting point, or tell us in your own words. You can change everything
          later.
        </p>
      </header>
      <IntentCapture
        initialDescribe={q?.slice(0, MAX_CLASSIFY_CHARS) ?? ""}
        initialCategory={toCategory(category) ?? null}
      />
    </main>
  );
}
