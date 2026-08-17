'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { assemblePreview, injectErrorHook } from '@/lib/preview';
import { withPreviewCsp } from '@/lib/preview-security';
import { friendlyPreviewIssue } from '@/lib/editor/preview-copy';
import { previewDocumentUrl } from '@/lib/editor/preview-frame';

const DEBOUNCE_MS = 120;

type Viewport = 'full' | 'phone';

export default function PreviewPane() {
    const vfs = useEditorStore((s) => s.vfs);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const tree = useEditorStore((s) => s.tree);

    const frame = useRef<HTMLIFrameElement>(null);
    const [viewport, setViewport] = useState<Viewport>('full');
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

    // Derived during render, not written into state from an effect.
    //
    // This was a useLayoutEffect that called setFrameUrl, which React's lint rule flags as
    // an error: setting state synchronously inside an effect renders the component, then
    // immediately renders it again with the new state. Every keystroke in the editor paid
    // for two renders of the preview pane and the frame flashed empty on the first of them.
    //
    // The blob still has to be revoked, so that stays in an effect — a cleanup, which is
    // what effects are for. Keyed on the url so the previous one is released the moment a
    // new document replaces it rather than only on unmount.
    const frameUrl = useMemo(() => previewDocumentUrl(preview.doc), [preview.doc]);

    useEffect(() => {
        return () => {
            if (frameUrl) URL.revokeObjectURL(frameUrl);
        };
    }, [frameUrl]);

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

    const issues = [...preview.warnings, ...(runtimeError ? [runtimeError] : [])]
        .map(friendlyPreviewIssue);
    const uniqueIssues = [...new Set(issues)];
    const showNotice = uniqueIssues.length > 0 && !dismissed;
    const empty = !preview.doc.trim();

    return (
        <div id="editor-preview" className="flex h-full min-h-0 w-full flex-col bg-muted/40">
            <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your site
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        aria-pressed={viewport === 'full'}
                        onClick={() => setViewport('full')}
                        className={`rounded-md px-2 py-0.5 text-xs ${
                            viewport === 'full' ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        Full
                    </button>
                    <button
                        type="button"
                        aria-pressed={viewport === 'phone'}
                        onClick={() => setViewport('phone')}
                        className={`rounded-md px-2 py-0.5 text-xs ${
                            viewport === 'phone' ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        Phone
                    </button>
                </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden p-3">
                <div
                    className={
                        viewport === 'phone'
                            ? 'relative mx-auto h-full w-[min(100%,390px)] overflow-hidden rounded-xl border border-border bg-white shadow-lg'
                            : 'relative h-full min-h-[320px] w-full overflow-hidden rounded-lg border border-border bg-white shadow-sm'
                    }
                >
                    {empty || !frameUrl ? (
                        <div className="flex h-full items-center justify-center p-6">
                            <p className="max-w-xs text-center text-sm text-neutral-600">
                                Your site will show up here as you edit.
                            </p>
                        </div>
                    ) : (
                        <iframe
                            ref={frame}
                            title="Your site"
                            sandbox="allow-scripts"
                            src={frameUrl}
                            className="absolute inset-0 h-full w-full border-0 bg-white"
                        />
                    )}
                </div>

                {showNotice && !empty && (
                    <div
                        role="status"
                        className="absolute inset-x-6 bottom-6 rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-medium">Could not show the whole page</p>
                                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                    {uniqueIssues.slice(0, 2).map((m, i) => (
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
        </div>
    );
}
