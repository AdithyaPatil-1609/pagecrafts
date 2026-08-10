import { apiGet, apiPut } from '@/lib/api/client';
import type { FileMap, GetProjectFilesResponse } from '@/lib/contracts';
import { apiPost } from '@/lib/api/client';
import type { CreateCommitResponse } from '@/lib/contracts';

export interface CommitResult {
    sha: string | null;
    error: string | null;
}

export async function createCommit(projectId: string, message: string): Promise<CommitResult> {
    const { data, error } = await apiPost<CreateCommitResponse>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/commits`,
        { message },
    );

    if (error || !data) return { sha: null, error: error ?? 'The server replied with nothing at all.' };
    return { sha: data.sha, error: null };
}

export interface ProjectLoadResult {
    files: FileMap;
    updatedAt: string | null;
    error: string | null;
}

export interface ProjectSaveResult {
    updatedAt: string | null;
    error: string | null;
}

const EMPTY_REPLY = 'The server replied with nothing at all.';

function filesUrl(projectId: string): string {
    return `/api/v1/projects/${encodeURIComponent(projectId)}/files`;
}

export async function loadProjectFiles(projectId: string): Promise<ProjectLoadResult> {
    if (!projectId.trim()) {
        return { files: {}, updatedAt: null, error: 'No project was requested.' };
    }

    const { data, error } = await apiGet<GetProjectFilesResponse>(filesUrl(projectId));

    if (error || !data) {
        return { files: {}, updatedAt: null, error: error ?? EMPTY_REPLY };
    }

    return { files: data.files, updatedAt: data.updatedAt, error: null };
}

export async function saveProjectFiles(
    projectId: string,
    files: FileMap,
): Promise<ProjectSaveResult> {
    if (Object.keys(files).length === 0) {
        return { updatedAt: null, error: 'A project must have at least one file.' };
    }

    const { data, error } = await apiPut<GetProjectFilesResponse>(filesUrl(projectId), { files });

    if (error || !data) {
        return { updatedAt: null, error: error ?? EMPTY_REPLY };
    }

    return { updatedAt: data.updatedAt, error: null };
}

export function pickEntryFile(paths: string[]): string | null {
    if (paths.length === 0) return null;
    if (paths.includes('index.html')) return 'index.html';
    return [...paths].sort()[0] ?? null;
}