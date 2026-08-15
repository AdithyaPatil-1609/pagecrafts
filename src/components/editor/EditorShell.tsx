'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/lib/editor-store';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { apiGet } from '@/lib/api/client';
import type { JobStatus } from '@/lib/ai/jobs/types';
import TopBar from './TopBar';
import ContentPanel from './ContentPanel';
import PreviewPane from './PreviewPane';
import FileTree from './FileTree';
import CodePane from './CodePane';
import { TreeSkeleton, PaneSkeleton } from './Skeletons';
import ChangeSummary from './ChangeSummary';
import SectionsPanel from './SectionsPanel';
import VersionHistory from './VersionHistory';
import { GeneratingOverlay } from './GeneratingOverlay';

interface JobProgress {
    status: JobStatus;
    sections_done: number;
    sections_total: number;
    files_ready?: boolean;
    error?: string;
}

export default function EditorShell({
    projectId,
    jobId,
}: {
    projectId: string;
    jobId?: string;
}) {
    useUnsavedGuard();
    const router = useRouter();
    const [historyOpen, setHistoryOpen] = useState(false);
    const [generation, setGeneration] = useState<JobProgress | null>(
        jobId ? { status: 'queued', sections_done: 0, sections_total: 0 } : null,
    );
    const advanced = useEditorStore((s) => s.advanced);
    const loading = useEditorStore((s) => s.loading);
    const loadError = useEditorStore((s) => s.loadError);
    const loadProject = useEditorStore((s) => s.loadProject);
    const saveProject = useEditorStore((s) => s.saveProject);
    const flushPendingSave = useEditorStore((s) => s.flushPendingSave);
    const composition = useEditorStore((s) => s.composition);

    useEffect(() => {
        if (jobId) return;
        loadProject(projectId);
        return () => flushPendingSave();
    }, [projectId, jobId, loadProject, flushPendingSave]);

    useEffect(() => {
        if (!jobId) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const poll = async () => {
            const { data, error } = await apiGet<JobProgress>(
                `/api/v1/jobs/${encodeURIComponent(jobId)}`,
            );
            if (cancelled) return;

            if (error || !data) {
                await loadProject(projectId);
                if (cancelled) return;
                setGeneration(null);
                router.replace(`/editor/${encodeURIComponent(projectId)}`);
                return;
            }

            setGeneration(data);

            if (data.status === 'done' || data.status === 'failed') {
                await loadProject(projectId);
                if (cancelled) return;
                if (data.status === 'done') {
                    setGeneration(null);
                    router.replace(`/editor/${encodeURIComponent(projectId)}`);
                }
                return;
            }

            timer = setTimeout(poll, 400);
        };

        void poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [jobId, projectId, loadProject, router]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveProject({ commit: true });
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [saveProject]);

    const generating = Boolean(generation && generation.status !== 'failed');

    return (
        <div className="flex h-screen flex-col bg-background">
            <TopBar
                projectId={projectId}
                historyOpen={historyOpen}
                onToggleHistory={() => setHistoryOpen((open) => !open)}
            />
            {loadError && !generating ? (
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
                <main className="relative flex min-h-0 flex-1">
                    {generation && (
                        <GeneratingOverlay
                            status={generation.status}
                            sectionsDone={generation.sections_done}
                            sectionsTotal={generation.sections_total}
                            error={generation.error}
                        />
                    )}
                    {composition && (
                        <aside className="w-64 shrink-0 overflow-auto border-r border-border">
                            <SectionsPanel />
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
                            <section className="min-w-0 flex-1">
                                {loading ? <PaneSkeleton /> : <PreviewPane />}
                            </section>
                        </>
                    ) : (
                        <>
                            <section className="w-[420px] shrink-0 overflow-auto border-r border-border">
                                {loading || generating ? <PaneSkeleton /> : <ContentPanel projectId={projectId} />}
                            </section>
                            <section className="min-w-0 flex-1">
                                {loading || generating ? <PaneSkeleton /> : <PreviewPane />}
                            </section>
                        </>
                    )}
                    {historyOpen && (
                        <aside className="w-72 shrink-0 overflow-hidden border-l border-border">
                            <VersionHistory />
                        </aside>
                    )}
                    <ChangeSummary />
                </main>
            )}
        </div>
    );
}
