'use client';
import { useEditorStore } from '@/lib/editor-store';

export default function CodePane() {
    const vfs = useEditorStore((s) => s.vfs);
    const activeFile = useEditorStore((s) => s.activeFile);
    const writeActive = useEditorStore((s) => s.writeActive);

    if (!activeFile) {
        return <div className="p-3 text-sm text-muted-foreground">No file open</div>;
    }

    return (
        <textarea
            value={vfs.read(activeFile) ?? ''}
            onChange={(e) => writeActive(e.target.value)}
            spellCheck={false}
            className="h-full w-full resize-none bg-background p-3 font-mono text-sm outline-none"
        />
    );
}