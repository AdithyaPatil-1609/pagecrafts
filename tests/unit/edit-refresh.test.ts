import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';

function fakeServer() {
    let stored: Record<string, string> = { 'index.html': 'original' };

    return vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes('/commits')) {
            return { json: async () => ({ ok: true, data: { sha: 'sha1' } }) } as Response;
        }
        if (init?.method === 'PUT') {
            stored = JSON.parse(String(init.body)).files;
        }
        return {
            json: async () => ({ ok: true, data: { projectId: 'p1', files: stored, updatedAt: 'now' } }),
        } as Response;
    });
}

beforeEach(() => {
    useEditorStore.setState({ projectId: null, saving: false, saveError: null });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('edits survive refresh', () => {
    it('a saved edit is still there after loading the project again', async () => {
        vi.stubGlobal('fetch', fakeServer());

        await useEditorStore.getState().loadProject('p1');
        useEditorStore.getState().openFile('index.html');
        useEditorStore.getState().writeActive('edited content');
        await useEditorStore.getState().saveProject({ commit: true });

        // A refresh is, from the store's point of view, loading the same project again
        // from nothing — so that's exactly what this line simulates.
        await useEditorStore.getState().loadProject('p1');

        expect(useEditorStore.getState().vfs.read('index.html')).toBe('edited content');
    });
});