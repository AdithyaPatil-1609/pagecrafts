'use client';
import { useEditorStore } from '@/lib/editor-store';

export default function TopBar({ projectId }: { projectId: string }) {
    const advanced = useEditorStore((s) => s.advanced);
    const toggleAdvanced = useEditorStore((s) => s.toggleAdvanced);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const saveProject = useEditorStore((s) => s.saveProject);

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-medium">{projectId}</span>
            <div className="flex items-center gap-3">
                {dirtyPaths.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {dirtyPaths.length} unsaved {dirtyPaths.length === 1 ? 'change' : 'changes'}
                    </span>
                )}
                <button
                    onClick={toggleAdvanced}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    {advanced ? 'Exit Advanced' : 'Advanced'}
                </button>
                <button
                    disabled={dirtyPaths.length === 0}
                    onClick={saveProject}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-40"
                >
                    Save
                </button>
            </div>
        </header>
    );
}