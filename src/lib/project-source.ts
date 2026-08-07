import { SEED_PROJECT } from '@/lib/seed';

export interface ProjectLoadResult {
    files: Record<string, string>;
    error: string | null;
}

const FAKE_LATENCY_MS = 250;

export async function loadProjectFiles(projectId: string): Promise<ProjectLoadResult> {
    if (!projectId.trim()) {
        return { files: {}, error: 'No project was requested.' };
    }

    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

    return { files: SEED_PROJECT, error: null };
}

export function pickEntryFile(paths: string[]): string | null {
    if (paths.length === 0) return null;
    if (paths.includes('index.html')) return 'index.html';
    return [...paths].sort()[0] ?? null;
}