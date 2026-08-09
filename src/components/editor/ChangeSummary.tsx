'use client';
import { useMemo } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { compareText, describeChange, type ChangeLine } from '@/lib/compare';

const LINE_STYLES: Record<ChangeLine['kind'], string> = {
    same: 'text-muted-foreground',
    added: 'bg-primary/10 text-foreground',
    removed: 'bg-destructive/10 text-muted-foreground line-through',
};

const LINE_MARKS: Record<ChangeLine['kind'], string> = {
    same: ' ',
    added: '+',
    removed: '−',
};

export default function ChangeSummary() {
    const pendingChange = useEditorStore((s) => s.pendingChange);
    const acceptChange = useEditorStore((s) => s.acceptChange);
    const rejectChange = useEditorStore((s) => s.rejectChange);

    const compared = useMemo(
        () => (pendingChange ? compareText(pendingChange.before, pendingChange.after) : null),
        [pendingChange],
    );

    if (!pendingChange || !compared) return null;

    return (
        <section
            aria-label="Suggested change"
            className="flex min-h-0 flex-col border-t border-border bg-card"
        >
            <header className="shrink-0 border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                    Suggested change to {pendingChange.path}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {pendingChange.explanation}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {describeChange(compared)}
                </p>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                <pre className="font-mono text-xs leading-relaxed">
                    {compared.lines.map((line, index) => (
                        <div key={index} className={`px-2 ${LINE_STYLES[line.kind]}`}>
                            <span aria-hidden className="mr-2 select-none opacity-60">
                                {LINE_MARKS[line.kind]}
                            </span>
                            {line.text || ' '}
                        </div>
                    ))}
                </pre>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-4 py-3">
                <button
                    onClick={rejectChange}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    Discard
                </button>
                <button
                    onClick={acceptChange}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                >
                    Keep this change
                </button>
            </footer>
        </section>
    );
}