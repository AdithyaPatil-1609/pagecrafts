'use client';
import { useEditorStore } from '@/lib/editor-store';

function statusLine(saving: boolean, saveError: string | null, unsaved: number, savedAt: string | null) {
    if (saving) return { text: 'Saving…', tone: 'muted' as const };
    if (saveError) return { text: saveError, tone: 'error' as const };
    if (unsaved > 0)
        return { text: `${unsaved} unsaved ${unsaved === 1 ? 'change' : 'changes'}`, tone: 'muted' as const };
    if (savedAt) return { text: 'All changes saved', tone: 'muted' as const };
    return null;
}

interface TopBarProps {
    projectId: string;
    hasComposition: boolean;
    sectionsOpen: boolean;
    onToggleSections: () => void;
    askOpen: boolean;
    onToggleAsk: () => void;
    historyOpen: boolean;
    onToggleHistory: () => void;
}

export default function TopBar({
    projectId,
    hasComposition,
    sectionsOpen,
    onToggleSections,
    askOpen,
    onToggleAsk,
    historyOpen,
    onToggleHistory,
}: TopBarProps) {
    const advanced = useEditorStore((s) => s.advanced);
    const toggleAdvanced = useEditorStore((s) => s.toggleAdvanced);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const saveProject = useEditorStore((s) => s.saveProject);
    const saving = useEditorStore((s) => s.saving);
    const saveError = useEditorStore((s) => s.saveError);
    const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
    const projectName = useEditorStore((s) => s.projectName);

    const status = statusLine(saving, saveError, dirtyPaths.length, lastSavedAt);

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="truncate text-sm font-medium" title={projectName ?? projectId}>
                {projectName ?? projectId}
            </span>
            <div className="flex items-center gap-2">
                {status && (
                    <span
                        className={
                            status.tone === 'error'
                                ? 'max-w-xs truncate text-xs text-destructive'
                                : 'mr-1 text-xs text-muted-foreground'
                        }
                        title={status.text}
                    >
                        {status.text}
                    </span>
                )}
                {hasComposition && (
                    <button
                        type="button"
                        onClick={onToggleSections}
                        aria-pressed={sectionsOpen}
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                    >
                        Sections
                    </button>
                )}
                <button
                    type="button"
                    onClick={onToggleAsk}
                    aria-pressed={askOpen}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    Ask
                </button>
                <button
                    type="button"
                    onClick={onToggleHistory}
                    aria-pressed={historyOpen}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    Versions
                </button>
                <button
                    type="button"
                    onClick={toggleAdvanced}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    {advanced ? 'Exit Advanced' : 'Advanced'}
                </button>
                <button
                    type="button"
                    disabled={dirtyPaths.length === 0 || saving}
                    onClick={() => saveProject({ commit: true })}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-40"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </header>
    );
}
