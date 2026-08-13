import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';

function jsonResponse(body: unknown) {
    return { json: async () => body } as Response;
}

beforeEach(() => {
    const { vfs } = useEditorStore.getState();
    vfs.reset();
    vfs.seed({ 'index.html': 'hello' });
    vfs.write('index.html', 'hello world');
    useEditorStore.setState({ projectId: 'p1', saving: false, saveError: null, lastCommitSha: null });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('an explicit save', () => {
    it('saves the files and also creates a version', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (String(url).includes('/commits')) {
                return jsonResponse({ ok: true, data: { sha: 'abc123' } });
            }
            return jsonResponse({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        });
        vi.stubGlobal('fetch', fetchMock);

        await useEditorStore.getState().saveProject({ commit: true });

        const calledCommits = fetchMock.mock.calls.some(([url]) => String(url).includes('/commits'));
        expect(calledCommits).toBe(true);
        expect(useEditorStore.getState().lastCommitSha).toBe('abc123');
    });
});

describe('a plain autosave', () => {
    it('saves the files without creating a version', async () => {
        const fetchMock = vi.fn(async (url: string) =>
            jsonResponse({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await useEditorStore.getState().saveProject();

        const calledCommits = fetchMock.mock.calls.some(([url]) => String(url).includes('/commits'));
        expect(calledCommits).toBe(false);
    });
});