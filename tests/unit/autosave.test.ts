import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';

function okReply(body: unknown) {
    return vi.fn().mockResolvedValue({ json: async () => body } as Response);
}

beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().vfs.reset();
    useEditorStore.getState().vfs.seed({ 'index.html': 'hello', 'styles.css': 'body {}' });
    useEditorStore.setState({
        projectId: 'p1',
        activeFile: 'index.html',
        saving: false,
        saveError: null,
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('autosave', () => {
    it('saves on its own after a pause in typing', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().writeActive('hello world');
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1500);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not save mid-typing', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().writeActive('h');
        await vi.advanceTimersByTimeAsync(1000);
        useEditorStore.getState().writeActive('he');
        await vi.advanceTimersByTimeAsync(1000);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('switching files saves immediately, without waiting', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().writeActive('hello world');
        useEditorStore.getState().openFile('styles.css');

        await vi.advanceTimersByTimeAsync(0);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('saves a kept suggestion after a pause', async () => {
        const fetchMock = okReply({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        useEditorStore.getState().proposeChange({
            path: 'index.html',
            after: '<h1>Kept</h1>',
            explanation: 'Updates the heading.',
        });
        useEditorStore.getState().acceptChange();
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1500);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
