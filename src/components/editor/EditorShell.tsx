'use client';
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import TopBar from './TopBar';
import ContentPanel from './ContentPanel';
import PreviewPane from './PreviewPane';
import FileTree from './FileTree';
import CodePane from './CodePane';
import { TreeSkeleton, PaneSkeleton } from './Skeletons';

export default function EditorShell({ projectId }: { projectId: string }) {
    const advanced = useEditorStore((s) => s.advanced);
    const loading = useEditorStore((s) => s.loading);
    const setLoaded = useEditorStore((s) => s.setLoaded);
    const saveProject = useEditorStore((s) => s.saveProject);

    useEffect(() => {
        setLoaded();
    }, [setLoaded]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveProject();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [saveProject]);

    return (
        <div className="flex h-screen flex-col bg-background">
            <TopBar projectId={projectId} />
            <main className="flex min-h-0 flex-1">
                {advanced ? (
                    <>
                        <aside className="w-56 shrink-0 overflow-auto border-r border-border">
                            {loading ? <TreeSkeleton /> : <FileTree />}
                        </aside>
                        <section className="min-w-0 flex-1 overflow-auto border-r border-border">
                            {loading ? <PaneSkeleton /> : <CodePane />}
                        </section>
                        <section className="min-w-0 flex-1">
                            {loading ? <PaneSkeleton /> : <PreviewPane />}
                        </section>
                    </>
                ) : (
                    <>
                        <section className="w-[420px] shrink-0 overflow-auto border-r border-border">
                            {loading ? <PaneSkeleton /> : <ContentPanel />}
                        </section>
                        <section className="min-w-0 flex-1">
                            {loading ? <PaneSkeleton /> : <PreviewPane />}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}