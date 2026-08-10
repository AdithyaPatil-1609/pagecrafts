import { apiGet, apiPatch } from '@/lib/api/client';
import type { ContentOp, ContentSchema, PatchContentResponse, ProjectDetail, SiteMeta } from '@/lib/contracts';

// The content panel's data access (R2 D8), kept out of the component for the same reason
// project-source.ts is: the panel should be about controls and layout, and swapping the
// stubs for the real endpoints should be a change in one file rather than in a component.

export interface ProjectContent {
    schema: ContentSchema;
    content: Record<string, unknown>;
    siteMeta: SiteMeta;
    error: string | null;
}

const EMPTY: ProjectContent = {
    schema: { sections: [] },
    content: {},
    siteMeta: {},
    error: null,
};

export async function loadProjectContent(projectId: string): Promise<ProjectContent> {
    const { data, error } = await apiGet<ProjectDetail>(
        `/api/v1/projects/${encodeURIComponent(projectId)}`,
    );

    if (error || !data) {
        return { ...EMPTY, error: error ?? 'The server replied with nothing at all.' };
    }

    return {
        schema: data.contentSchema ?? { sections: [] },
        content: data.contentJson ?? {},
        siteMeta: data.siteMeta ?? {},
        error: null,
    };
}

/** Returns null on success, or a message the panel can show beside the field. */
export async function saveContentOps(projectId: string, ops: ContentOp[]): Promise<string | null> {
    if (ops.length === 0) return null;

    const { error } = await apiPatch<PatchContentResponse>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/content`,
        { ops },
    );

    return error;
}

/**
 * Site metadata rides on the project itself, not on content_json — it describes the site
 * rather than any section of the page, and publish reads it from there (S-3, S-4).
 */
export async function saveSiteMeta(projectId: string, siteMeta: SiteMeta): Promise<string | null> {
    const { error } = await apiPatch<ProjectDetail>(
        `/api/v1/projects/${encodeURIComponent(projectId)}`,
        { siteMeta },
    );

    return error;
}
