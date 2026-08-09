import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadProjectFiles, saveProjectFiles } from '@/lib/project-source';

function replyWith(body: unknown) {
    return vi.fn().mockResolvedValue({ json: async () => body } as Response);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loadProjectFiles', () => {
    it('does not call the server when there is no project id', async () => {
        const fetchMock = replyWith({ ok: true, data: {} });
        vi.stubGlobal('fetch', fetchMock);

        const { error } = await loadProjectFiles('');

        expect(error).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns the files the server sent', async () => {
        vi.stubGlobal(
            'fetch',
            replyWith({
                ok: true,
                data: { projectId: 'p1', files: { 'index.html': 'hi' }, updatedAt: 'now' },
            }),
        );

        const { files, updatedAt, error } = await loadProjectFiles('p1');

        expect(error).toBeNull();
        expect(files).toEqual({ 'index.html': 'hi' });
        expect(updatedAt).toBe('now');
    });

    it('passes a server error back as a readable sentence', async () => {
        vi.stubGlobal(
            'fetch',
            replyWith({ ok: false, error: { code: 'forbidden', message: 'nope' } }),
        );

        const { files, error } = await loadProjectFiles('someone-elses-project');

        expect(error).toBe('This project belongs to someone else.');
        expect(Object.keys(files)).toHaveLength(0);
    });
});

describe('saveProjectFiles', () => {
    it('refuses to send an empty project', async () => {
        const fetchMock = replyWith({ ok: true, data: {} });
        vi.stubGlobal('fetch', fetchMock);

        const { error } = await saveProjectFiles('p1', {});

        expect(error).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});