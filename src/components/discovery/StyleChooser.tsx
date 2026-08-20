"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiGet, apiPost } from "@/lib/api/client";
import type { JobStatus } from "@/lib/ai/jobs/types";
import type { StyleId } from "@/lib/ai/generate/styles";
import { GeneratingOverlay } from "@/components/editor/GeneratingOverlay";

interface VariantCard {
    id: StyleId;
    label: string;
    html: string;
}

interface JobProgress {
    status: JobStatus;
    sections_done: number;
    sections_total: number;
    files_ready?: boolean;
    fallback_template_id?: string;
    error?: string;
    variants?: VariantCard[];
}

/**
 * Old `/choose` URLs used to ask Free / Pro / Premium before the editor.
 * Editing is not a plan picker: persist the default look if needed, then open
 * the project. The generating overlay stays until that handoff finishes.
 */
export function StyleChooser({
    projectId,
    jobId,
}: {
    projectId: string;
    jobId?: string;
}) {
    const router = useRouter();
    const [progress, setProgress] = useState<JobProgress | null>(
        jobId ? { status: "queued", sections_done: 0, sections_total: 0 } : null,
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const editor = `/editor/${encodeURIComponent(projectId)}`;
        if (!jobId) {
            router.replace(editor);
            return;
        }

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const openEditor = () => {
            if (cancelled) return;
            router.replace(editor);
        };

        const poll = async () => {
            const { data, error: failure } = await apiGet<JobProgress>(
                `/api/v1/jobs/${encodeURIComponent(jobId)}`,
            );
            if (cancelled) return;

            if (failure || !data) {
                setError(failure ?? "That generation could not be found.");
                setProgress(null);
                return;
            }

            setProgress(data);

            if (data.status === "failed") {
                setError(data.error ?? "The site could not be generated.");
                return;
            }

            if (data.status !== "done") {
                timer = setTimeout(poll, 400);
                return;
            }

            if (!data.files_ready && data.variants?.[0]) {
                const { error: chooseError } = await apiPost<{ id: string }>(
                    `/api/v1/projects/${encodeURIComponent(projectId)}/generate/choose`,
                    { jobId, variantId: data.variants[0].id },
                );
                if (cancelled) return;
                if (chooseError) {
                    setError(chooseError);
                    return;
                }
            }

            openEditor();
        };

        void poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [jobId, projectId, router]);

    const generating = progress && progress.status !== "done" && progress.status !== "failed";

    return (
        <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-4">
            {generating && progress && (
                <GeneratingOverlay
                    status={progress.status}
                    sectionsDone={progress.sections_done}
                    sectionsTotal={progress.sections_total}
                />
            )}

            {error && (
                <p role="alert" className="text-center text-sm text-destructive">
                    {error}
                </p>
            )}
        </main>
    );
}
