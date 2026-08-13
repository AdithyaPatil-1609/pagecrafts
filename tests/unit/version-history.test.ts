import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditorStore } from '@/lib/editor-store';

// Version history and restore (V-1, FR-075). The rule the UI rests on: going back never
// loses anything — not the newer versions, and not the work in front of you when you press
// it. Both halves are asserted here, because both are promises the copy makes out loud.

const PROJECT = '00000000-0000-4000-8000-000000000001';
const SHA = '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d';

const COMMITS = [
    { sha: 'ffffffffffffffffffffffffffffffffffffffff', message: 'Latest', author: 'user', createdAt: '2026-08-13T09:00:00.000Z' },
    { sha: SHA, message: 'Start from the Cafe design', author: 'system', createdAt: '2026-08-13T08:00:00.000Z' },
];

function envelope(data: unknown, ok = true) {
    return new Response(
        JSON.stringify(ok ? { ok: true, data } : { ok: false, error: data }),
        { status: ok ? 200 : 422, headers: { 'content-type': 'application/json' } },
    );
}

/** Answers each editor call by URL and method, and records what was asked. */
function routeFetch(overrides: Record<string, () => Response> = {}) {
    const calls: string[] = [];

    return {
        calls,
        handler: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? 'GET';
            const key = `${method} ${url.replace(/^https?:\/\/[^/]+/, '')}`;
            calls.push(key);

            const override = overrides[key];
            if (override) return override();

            if (key.endsWith('/commits') && method === 'GET') return envelope({ items: COMMITS });
            if (key.endsWith('/restore')) return envelope({ newSha: SHA });
            if (key.endsWith('/files') && method === 'GET') {
                return envelope({
                    projectId: PROJECT,
                    files: { 'index.html': '<h1>Restored</h1>' },
                    updatedAt: '2026-08-13T09:05:00.000Z',
                });
            }
            if (key.endsWith('/files') && method === 'PUT') {
                return envelope({
                    projectId: PROJECT,
                    files: {},
                    updatedAt: '2026-08-13T09:05:00.000Z',
                });
            }
            return envelope({
                id: PROJECT,
                name: 'Kettle & Co.',
                status: 'draft',
                liveUrl: null,
                thumbnailUrl: null,
                updatedAt: '2026-08-13T09:05:00.000Z',
                sourceTemplateId: null,
                contentJson: {},
                siteMeta: {},
                formEndpoint: null,
                contentSchema: null,
            });
        }),
    };
}

beforeEach(() => {
    const { vfs } = useEditorStore.getState();
    vfs.reset();
    vfs.seed({ 'index.html': '<h1>Before</h1>' });

    useEditorStore.setState({
        projectId: PROJECT,
        history: [],
        historyError: null,
        historyLoading: false,
        restoringSha: null,
        contentSchema: null,
    });
});

afterEach(() => vi.restoreAllMocks());

describe('reading the history', () => {
    it('lists the save points, newest first', async () => {
        const { handler } = routeFetch();
        vi.stubGlobal('fetch', handler);

        await useEditorStore.getState().loadHistory();

        const { history, historyError } = useEditorStore.getState();
        expect(historyError).toBeNull();
        expect(history.map((c) => c.message)).toEqual(['Latest', 'Start from the Cafe design']);
    });

    it('says so when it cannot be read, and keeps the editor open', async () => {
        const { handler } = routeFetch({
            [`GET /api/v1/projects/${PROJECT}/commits`]: () =>
                envelope({ code: 'internal', message: 'Could not read the history.' }, false),
        });
        vi.stubGlobal('fetch', handler);

        await useEditorStore.getState().loadHistory();

        expect(useEditorStore.getState().historyError).toBeTruthy();
        expect(useEditorStore.getState().history).toEqual([]);
    });
});

describe('going back to a version', () => {
    it('saves unsaved work first, so restoring cannot discard it', async () => {
        const { handler, calls } = routeFetch();
        vi.stubGlobal('fetch', handler);

        // An edit the person has made but not saved.
        useEditorStore.getState().vfs.write('index.html', '<h1>Unsaved</h1>');

        await useEditorStore.getState().restoreTo(SHA);

        const put = calls.indexOf(`PUT /api/v1/projects/${PROJECT}/files`);
        const restore = calls.indexOf(`POST /api/v1/projects/${PROJECT}/restore`);

        expect(put).toBeGreaterThanOrEqual(0);
        expect(put).toBeLessThan(restore);
    });

    it('re-reads the project afterwards rather than guessing what it now holds', async () => {
        const { handler } = routeFetch();
        vi.stubGlobal('fetch', handler);

        await useEditorStore.getState().restoreTo(SHA);

        expect(useEditorStore.getState().vfs.read('index.html')).toBe('<h1>Restored</h1>');
        expect(useEditorStore.getState().restoringSha).toBeNull();
    });

    it('leaves the working tree alone when the restore is refused', async () => {
        const { handler } = routeFetch({
            [`POST /api/v1/projects/${PROJECT}/restore`]: () =>
                envelope({ code: 'validation_failed', message: 'That version has no snapshot.' }, false),
        });
        vi.stubGlobal('fetch', handler);

        await useEditorStore.getState().restoreTo(SHA);

        // The tree is what matters: a refused restore must not half-apply. The message the
        // user reads comes from the shared code-to-copy map in lib/api/messages.ts.
        expect(useEditorStore.getState().vfs.read('index.html')).toBe('<h1>Before</h1>');
        expect(useEditorStore.getState().historyError).toBeTruthy();
        expect(useEditorStore.getState().restoringSha).toBeNull();
    });

    it('ignores a second press while one is already running', async () => {
        const { handler, calls } = routeFetch();
        vi.stubGlobal('fetch', handler);

        useEditorStore.setState({ restoringSha: SHA });
        await useEditorStore.getState().restoreTo(SHA);

        expect(calls.some((c) => c.includes('/restore'))).toBe(false);
    });

    it('does nothing at all without a project', async () => {
        const { handler, calls } = routeFetch();
        vi.stubGlobal('fetch', handler);

        useEditorStore.setState({ projectId: null });
        await useEditorStore.getState().restoreTo(SHA);

        expect(calls).toEqual([]);
    });
});
