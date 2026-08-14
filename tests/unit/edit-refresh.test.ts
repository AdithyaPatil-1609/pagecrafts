import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';

function fakeServer(files: Record<string, string> = { 'index.html': 'original' }) {
    let stored = files;

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

    it('migrates composition.json when the project opens', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const { SCHEMA_VERSION } = await import('@/lib/contracts');
        const v2 = readFileSync(join(process.cwd(), 'tests/fixtures/compositions/v2.json'), 'utf8');

        vi.stubGlobal('fetch', fakeServer({ 'index.html': '<h1/>', 'composition.json': v2 }));
        await useEditorStore.getState().loadProject('p1');

        const composition = useEditorStore.getState().composition;
        expect(composition?.schemaVersion).toBe(SCHEMA_VERSION);
        expect(composition?.artDirection.themeId).toBe('clinical-blue');
        expect(useEditorStore.getState().vfs.read('composition.json')).toContain('"schemaVersion": 3');
    });
});