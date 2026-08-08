import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPut } from '@/lib/api/client';

function replyWith(body: unknown) {
    return vi.fn().mockResolvedValue({ json: async () => body } as Response);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('api client', () => {
    it('hands back the data when the envelope is ok', async () => {
        vi.stubGlobal('fetch', replyWith({ ok: true, data: { files: { 'index.html': 'hi' } } }));

        const result = await apiGet<{ files: Record<string, string> }>('/api/v1/projects/p1/files');

        expect(result.error).toBeNull();
        expect(result.data).toEqual({ files: { 'index.html': 'hi' } });
    });

    it('turns an error code into a plain sentence', async () => {
        vi.stubGlobal(
            'fetch',
            replyWith({ ok: false, error: { code: 'not_found', message: 'That project does not exist.' } }),
        );

        const result = await apiGet('/api/v1/projects/missing/files');

        expect(result.data).toBeNull();
        expect(result.error).toBe('We could not find this project.');
    });

    it('reports a friendly message when the network is down', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        const result = await apiPut('/api/v1/projects/p1/files', { files: {} });

        expect(result.error).toContain('could not reach');
    });

    it('sends the files as JSON on a save', async () => {
        const fetchMock = replyWith({ ok: true, data: { projectId: 'p1', files: {}, updatedAt: 'now' } });
        vi.stubGlobal('fetch', fetchMock);

        await apiPut('/api/v1/projects/p1/files', { files: { 'index.html': '<h1>hi</h1>' } });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe('PUT');
        expect(JSON.parse(init.body)).toEqual({ files: { 'index.html': '<h1>hi</h1>' } });
    });
});