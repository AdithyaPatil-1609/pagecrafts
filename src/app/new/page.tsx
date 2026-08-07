import { IntentCapture } from "@/components/discovery/IntentCapture";

// Screen 03 — "What are you building?" Neither input is required; picking a category or
// describing the site routes to the gallery, and both empty shows every template.
export default function NewProjectPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">What are you building?</h1>
        <p className="text-muted-foreground">
          Pick a starting point, or tell us in your own words. You can change everything
          later.
        </p>
      </header>
      <IntentCapture />
    </main>
  );
}
