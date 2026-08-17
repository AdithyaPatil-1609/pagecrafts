import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadProjectContent } from '@/lib/project-content-source';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loadProjectContent', () => {
    it('does not treat an empty schema object as a missing project', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            json: async () => ({
                ok: true,
                data: {
                    id: 'p1',
                    name: 'Freelancer',
                    contentSchema: {},
                    contentJson: {},
                    siteMeta: {},
                },
            }),
        }) as Response));

        const result = await loadProjectContent('p1');

        expect(result.error).toBeNull();
        expect(result.schema).toEqual({ sections: [] });
    });
});
