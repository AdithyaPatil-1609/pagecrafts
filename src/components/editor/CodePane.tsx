'use client';
import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { indentUnit } from '@codemirror/language';
import { useEditorStore } from '@/lib/editor-store';
import { languageFor } from '@/lib/languages';
import { pagecraftTheme } from './cmTheme';

const WRITE_DELAY_MS = 150;

export default function CodePane() {
    const host = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cursors = useRef(new Map<string, number>());

    const vfs = useEditorStore((s) => s.vfs);
    const activeFile = useEditorStore((s) => s.activeFile);

    useEffect(() => {
        if (!host.current || !activeFile) return;

        const doc = vfs.read(activeFile) ?? '';
        const positions = cursors.current;
        const saved = Math.min(positions.get(activeFile) ?? 0, doc.length);

        const state = EditorState.create({
            doc,
            selection: { anchor: saved },
            extensions: [
                basicSetup,
                pagecraftTheme,
                indentUnit.of('  '),
                EditorView.lineWrapping,
                ...languageFor(activeFile),
                EditorView.updateListener.of((u) => {
                    if (!u.docChanged) return;
                    if (timer.current) clearTimeout(timer.current);
                    timer.current = setTimeout(() => {
                        timer.current = null;
                        if (vfs.read(activeFile) === null) return;
                        vfs.write(activeFile, u.state.doc.toString());
                    }, WRITE_DELAY_MS);
                }),
            ],
        });

        const view = new EditorView({ state, parent: host.current });

        return () => {
            positions.set(activeFile, view.state.selection.main.head);
            if (timer.current) {
                clearTimeout(timer.current);
                timer.current = null;
                if (vfs.read(activeFile) !== null) {
                    vfs.write(activeFile, view.state.doc.toString());
                }
            }
            view.destroy();
        };
    }, [activeFile, vfs]);

    if (!activeFile) {
        return <div className="p-3 text-sm text-muted-foreground">No file open</div>;
    }

    return <div ref={host} className="h-full overflow-auto text-sm" />;
}