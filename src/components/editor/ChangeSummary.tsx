'use client';
import { useEditorStore } from '@/lib/editor-store';

export default function ChangeSummary() {
    const pendingChange = useEditorStore((s) => s.pendingChange);
    const acceptChange = useEditorStore((s) => s.acceptChange);
    const rejectChange = useEditorStore((s) => s.rejectChange);

    if (!pendingChange) return null;

    return (
        <section
            aria-label="Suggested change"
            className="flex shrink-0 flex-col border-t border-border bg-card"
        >
            <header className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">Suggested change</p>
                <p className="mt-1 text-sm text-muted-foreground">{pendingChange.explanation}</p>
            </header>

            <footer className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
                <button
                    type="button"
                    onClick={rejectChange}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={acceptChange}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                >
                    Keep this change
                </button>
            </footer>
        </section>
    );
}
