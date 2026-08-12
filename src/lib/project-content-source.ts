import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { friendlyMessage, OFFLINE_MESSAGE, UNREADABLE_MESSAGE } from '@/lib/api/messages';
import type { PhotoResult } from '@/lib/data/unsplash-search';
import type {
    ApiResult,
    AssetKind,
    AssetResponse,
    ContentOp,
    ContentSchema,
    PatchContentResponse,
    ProjectDetail,
    SiteMeta,
} from '@/lib/contracts';

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
 * Photo search for the picker (R2 D12).
 *
 * The query goes to our own route, never to Unsplash directly: the access key is a server
 * secret, and a key the browser holds is a key anybody can spend.
 */
export async function searchPhotos(query: string): Promise<{ items: PhotoResult[]; error: string | null }> {
    const { data, error } = await apiGet<{ items: PhotoResult[] }>(
        `/api/v1/photos?q=${encodeURIComponent(query)}`,
    );

    if (error || !data) return { items: [], error: error ?? "The server replied with nothing at all." };
    return { items: data.items, error: null };
}

/** Turn an Unsplash pick into an asset this project owns. Returns its id. */
export async function pickPhoto(
    projectId: string,
    unsplashId: string,
    kind: AssetKind,
): Promise<{ asset: AssetResponse | null; error: string | null }> {
    const { data, error } = await apiPost<AssetResponse>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/assets`,
        { unsplashId, kind },
    );

    return { asset: data, error: error ?? (data ? null : "The server replied with nothing at all.") };
}

/**
 * Upload an image the person chose from their own machine.
 *
 * multipart rather than JSON, and therefore not through apiPost: the route takes the file
 * as a stream so an oversized one is refused before it is read into memory (E-4). Setting a
 * content-type header by hand here would break the boundary the browser generates.
 */
export async function uploadPhoto(
    projectId: string,
    file: File,
    kind: AssetKind,
): Promise<{ asset: AssetResponse | null; error: string | null }> {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);

    try {
        const response = await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/assets`, {
            method: "POST",
            body,
        });
        const payload = (await response.json()) as ApiResult<AssetResponse>;

        if (!payload || typeof payload !== "object" || !("ok" in payload)) {
            return { asset: null, error: UNREADABLE_MESSAGE };
        }
        if (!payload.ok) {
            return { asset: null, error: friendlyMessage(payload.error.code, payload.error.message) };
        }
        return { asset: payload.data, error: null };
    } catch {
        return { asset: null, error: OFFLINE_MESSAGE };
    }
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
