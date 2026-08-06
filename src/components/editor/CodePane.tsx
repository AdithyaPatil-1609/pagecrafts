'use client';
import { useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';

export default function CodePane() {
    const vfs = useEditorStore((s) => s.vfs);
    const activeFile = useEditorStore((s) => s.activeFile);
    const writeActive = useEditorStore((s) => s.writeActive);
    const [text, setText] = useState('');
    const [loadedFile, setLoadedFile] = useState<string | null>(null);

    if (activeFile !== loadedFile) {
        setLoadedFile(activeFile);
        setText(activeFile ? (vfs.read(activeFile) ?? '') : '');
    }

    if (!activeFile) {
        return <div className="p-3 text-sm text-muted-foreground">No file open</div>;
    }

    return (
        <textarea
            value={text}
            onChange={(e) => {
                setText(e.target.value);
                writeActive(e.target.value);
            }}
            spellCheck={false}
            className="h-full w-full resize-none bg-background p-3 font-mono text-sm outline-none"
        />
    );
}