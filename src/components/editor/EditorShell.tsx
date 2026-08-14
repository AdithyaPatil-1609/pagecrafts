'use client';
import { useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import TopBar from './TopBar';
import ContentPanel from './ContentPanel';
import PreviewPane from './PreviewPane';
import FileTree from './FileTree';
import CodePane from './CodePane';
import { TreeSkeleton, PaneSkeleton } from './Skeletons';
import SectionsPanel from './SectionsPanel';
import VersionHistory from './VersionHistory';
import ChatPanel from './ChatPanel';

export default function EditorShell({ projectId }: { projectId: string }) {
    useUnsavedGuard();
    const [historyOpen, setHistoryOpen] = useState(false);
    const [askOpen, setAskOpen] = useState(false);
    const [sectionsOpen, setSectionsOpen] = useState(false);
    const advanced = useEditorStore((s) => s.advanced);
    const loading = useEditorStore((s) => s.loading);
    const loadError = useEditorStore((s) => s.loadError);
    const loadProject = useEditorStore((s) => s.loadProject);
    const saveProject = useEditorStore((s) => s.saveProject);
    const flushPendingSave = useEditorStore((s) => s.flushPendingSave);
    const composition = useEditorStore((s) => s.composition);
    const pendingChange = useEditorStore((s) => s.pendingChange);
    const rejectChange = useEditorStore((s) => s.rejectChange);

    useEffect(() => {
        loadProject(projectId);
        return () => flushPendingSave();
    }, [projectId, loadProject, flushPendingSave]);

    useEffect(() => {
        if (pendingChange) setAskOpen(true);
    }, [pendingChange]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveProject({ commit: true });
                return;
            }
            if (e.key === 'Escape') {
                if (pendingChange) {
                    e.preventDefault();
                    rejectChange();
                    return;
                }
                setAskOpen(false);
                setHistoryOpen(false);
                setSectionsOpen(false);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [saveProject, pendingChange, rejectChange]);

    return (
        <div className="flex h-screen flex-col bg-background">
            <a
                href="#editor-preview"
                className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
            >
                Skip to preview
            </a>
            <TopBar
                projectId={projectId}
                hasComposition={!!composition}
                sectionsOpen={sectionsOpen}
                onToggleSections={() => setSectionsOpen((open) => !open)}
                askOpen={askOpen}
                onToggleAsk={() => setAskOpen((open) => !open)}
                historyOpen={historyOpen}
                onToggleHistory={() => setHistoryOpen((open) => !open)}
            />
            {loadError ? (
                <div className="flex flex-1 items-center justify-center p-8">
                    <div className="max-w-sm text-center">
                        <p className="text-sm font-medium">This project could not be opened.</p>
                        <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                        <button
                            onClick={() => loadProject(projectId)}
                            className="mt-4 rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            ) : (
                <main className="flex min-h-0 flex-1">
                    {sectionsOpen && composition && (
                        <aside className="w-64 shrink-0 overflow-auto border-r border-border">
                            {loading ? <TreeSkeleton /> : <SectionsPanel />}
                        </aside>
                    )}
                    {advanced ? (
                        <>
                            <aside className="w-56 shrink-0 overflow-auto border-r border-border">
                                {loading ? <TreeSkeleton /> : <FileTree />}
                            </aside>
                            <section className="min-w-0 flex-1 overflow-auto border-r border-border">
                                {loading ? <PaneSkeleton /> : <CodePane />}
                            </section>
                            <section className="relative min-h-0 min-w-0 flex-1">
                                {loading ? <PaneSkeleton /> : <PreviewPane />}
                            </section>
                        </>
                    ) : (
                        <>
                            <section className="w-[420px] shrink-0 overflow-auto border-r border-border">
                                {loading ? <PaneSkeleton /> : <ContentPanel projectId={projectId} />}
                            </section>
                            <section className="relative min-h-0 min-w-0 flex-1">
                                {loading ? <PaneSkeleton /> : <PreviewPane />}
                            </section>
                        </>
                    )}
                    {askOpen && (
                        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border">
                            {loading ? <PaneSkeleton /> : <ChatPanel />}
                        </aside>
                    )}
                    {historyOpen && (
                        <aside className="w-72 shrink-0 overflow-hidden border-l border-border">
                            <VersionHistory />
                        </aside>
                    )}
                </main>
            )}
        </div>
    );
}
