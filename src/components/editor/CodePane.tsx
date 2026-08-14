'use client';
import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { indentUnit } from '@codemirror/language';
import { useEditorStore } from '@/lib/editor-store';
import { languageFor } from '@/lib/languages';
import { isLargeFile } from '@/lib/editor/large-file';
import { pagecraftTheme } from './cmTheme';

const WRITE_DELAY_MS = 150;

export default function CodePane() {
    const host = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cursors = useRef(new Map<string, number>());

    const vfs = useEditorStore((s) => s.vfs);
    const activeFile = useEditorStore((s) => s.activeFile);
    const doc = activeFile ? vfs.read(activeFile) ?? '' : '';
    const large = isLargeFile(doc);

    useEffect(() => {
        if (!host.current || !activeFile) return;

        const text = vfs.read(activeFile) ?? '';
        const positions = cursors.current;
        const saved = Math.min(positions.get(activeFile) ?? 0, text.length);
        const skipHighlight = isLargeFile(text);

        const state = EditorState.create({
            doc: text,
            selection: { anchor: saved },
            extensions: [
                basicSetup,
                pagecraftTheme,
                indentUnit.of('  '),
                ...(skipHighlight ? [] : [EditorView.lineWrapping, ...languageFor(activeFile)]),
                EditorView.updateListener.of((u) => {
                    if (!u.docChanged) return;
                    if (timer.current) clearTimeout(timer.current);
                    timer.current = setTimeout(() => {
                        timer.current = null;
                        if (vfs.read(activeFile) === null) return;
                        useEditorStore.getState().writeActive(u.state.doc.toString());
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
                    useEditorStore.getState().writeActive(view.state.doc.toString());
                }
            }
            view.destroy();
        };
    }, [activeFile, vfs, large]);

    if (!activeFile) {
        return (
            <div className="p-3 text-sm text-muted-foreground">
                No file open. Pick one from the list, or add a file with +.
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {large && (
                <p className="shrink-0 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                    Large file — colouring is off so the editor stays quick.
                </p>
            )}
            <div ref={host} className="min-h-0 flex-1 overflow-auto text-sm" />
        </div>
    );
}
