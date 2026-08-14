'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { assemblePreview, injectErrorHook } from '@/lib/preview';
import { withPreviewCsp } from '@/lib/preview-security';

const DEBOUNCE_MS = 120;

export default function PreviewPane() {
    const vfs = useEditorStore((s) => s.vfs);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const tree = useEditorStore((s) => s.tree);

    const frame = useRef<HTMLIFrameElement>(null);
    const [preview, setPreview] = useState(() => {
        const r = assemblePreview(vfs.toMap());
        return { doc: withPreviewCsp(injectErrorHook(r.html)), warnings: r.warnings };
    });
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const last = useRef(preview.doc);

    useEffect(() => {
        const t = setTimeout(() => {
            const r = assemblePreview(vfs.toMap());
            const next = withPreviewCsp(injectErrorHook(r.html));
            if (next === last.current) return;
            last.current = next;
            setPreview({ doc: next, warnings: r.warnings });
            setRuntimeError(null);
            setDismissed(false);
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [vfs, dirtyPaths, tree]);

    useEffect(() => {
        function onMessage(e: MessageEvent) {
            if (e.source !== frame.current?.contentWindow) return;
            const data = e.data as { __pagecraft?: boolean; message?: string };
            if (!data?.__pagecraft) return;
            setRuntimeError(data.message ?? 'Unknown error');
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    const issues = [...preview.warnings, ...(runtimeError ? [runtimeError] : [])];
    const showNotice = issues.length > 0 && !dismissed;
    const empty = !preview.doc.trim();

    return (
        <div id="editor-preview" className="relative h-full min-h-0 w-full overflow-hidden">
            {empty ? (
                <div className="flex h-full min-h-[320px] items-center justify-center bg-white p-6">
                    <p className="max-w-xs text-center text-sm text-neutral-600">
                        {issues[0] ?? 'Nothing to preview yet. Add a page to see it here.'}
                    </p>
                </div>
            ) : (
                <iframe
                    ref={frame}
                    title="Preview"
                    sandbox="allow-scripts"
                    srcDoc={preview.doc}
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                />
            )}

            {showNotice && !empty && (
                <div
                    role="status"
                    className="absolute inset-x-3 bottom-3 rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-medium">Preview issue</p>
                            <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                {issues.slice(0, 3).map((m, i) => (
                                    <li key={i} className="truncate">{m}</li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => setDismissed(true)}
                            aria-label="Dismiss"
                            className="shrink-0 rounded px-1 text-muted-foreground hover:bg-muted"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
