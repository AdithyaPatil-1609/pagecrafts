import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';
import type { Composition, EditProposal } from '@/lib/contracts';

function sample(): Composition {
    return {
        schemaVersion: 3,
        vertical: 'consultant',
        artDirection: {
            themeId: 'clinical-blue',
            motionId: 'calm',
            radiusId: 'soft',
            spacingId: 'default',
            imageryId: 'bright-clean',
        },
        meta: { title: 'Test', description: 'Test', lang: 'en' },
        sections: [
            {
                id: 's1', type: 'hero', variant: 'centred', brief: '',
                visible: true, locked: false, source: 'ai',
                props: { heading: 'Old heading' },
            },
        ],
    };
}

function jsonResponse(body: unknown) {
    return { json: async () => body } as Response;
}

const proposal: EditProposal = {
    targetSectionId: 's1',
    patch: [{ op: 'replace', path: '/props/heading', value: 'New heading' }],
    explanation: 'Makes the heading clearer.',
    applied: false,
};

function fakeServer() {
    return vi.fn(async (url: string) => {
        const path = String(url);
        if (path.includes('/edits')) {
            return jsonResponse({ ok: true, data: proposal });
        }
        if (path.includes('/commits')) {
            return jsonResponse({ ok: true, data: { sha: 'pre-edit' } });
        }
        return jsonResponse({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
    });
}

beforeEach(() => {
    const composition = sample();
    const { vfs } = useEditorStore.getState();
    vfs.reset();
    vfs.seed({
        'index.html': '<h1>Old heading</h1>',
        'composition.json': JSON.stringify(composition, null, 2),
    });
    useEditorStore.setState({
        projectId: 'p1',
        composition,
        selectedSectionId: 's1',
        pendingChange: null,
        chatMessages: [],
        chatBusy: false,
        chatError: null,
        saving: false,
        saveError: null,
        lastCommitSha: null,
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('AI chat (D11–D15)', () => {
    it('saves a version, then proposes without writing the file', async () => {
        const fetchMock = fakeServer();
        vi.stubGlobal('fetch', fetchMock);

        const before = useEditorStore.getState().vfs.read('composition.json');
        await useEditorStore.getState().requestAiEdit('Make the heading shorter');

        const called = fetchMock.mock.calls.map(([url]) => String(url));
        expect(called.some((url) => url.includes('/commits'))).toBe(true);
        expect(called.some((url) => url.includes('/edits'))).toBe(true);
        expect(useEditorStore.getState().lastCommitSha).toBe('pre-edit');
        expect(useEditorStore.getState().vfs.read('composition.json')).toBe(before);
        expect(useEditorStore.getState().pendingChange?.explanation).toBe(
            'Makes the heading clearer.',
        );
        expect(useEditorStore.getState().pendingChange?.after).toContain('New heading');
    });

    it('leaves the file untouched when the suggestion is discarded', async () => {
        vi.stubGlobal('fetch', fakeServer());

        const beforeJson = useEditorStore.getState().vfs.read('composition.json');
        const beforeHtml = useEditorStore.getState().vfs.read('index.html');

        await useEditorStore.getState().requestAiEdit('Make the heading shorter');
        useEditorStore.getState().rejectChange();

        expect(useEditorStore.getState().vfs.read('composition.json')).toBe(beforeJson);
        expect(useEditorStore.getState().vfs.read('index.html')).toBe(beforeHtml);
        expect(useEditorStore.getState().pendingChange).toBeNull();
        expect(useEditorStore.getState().vfs.dirtyPaths()).toEqual([]);
    });

    it('writes the new composition when the suggestion is kept', async () => {
        vi.stubGlobal('fetch', fakeServer());

        await useEditorStore.getState().requestAiEdit('Make the heading shorter');
        useEditorStore.getState().acceptChange();

        expect(useEditorStore.getState().composition?.sections[0].props.heading).toBe('New heading');
        expect(useEditorStore.getState().vfs.read('composition.json')).toContain('New heading');
        expect(useEditorStore.getState().vfs.read('index.html')).toContain('New heading');
        expect(useEditorStore.getState().pendingChange).toBeNull();
    });

    it('refuses a locked section', async () => {
        const composition = sample();
        composition.sections[0].locked = true;
        useEditorStore.setState({ composition });

        await useEditorStore.getState().requestAiEdit('Change it');

        expect(useEditorStore.getState().chatError).toMatch(/locked/i);
        expect(useEditorStore.getState().pendingChange).toBeNull();
    });
});
