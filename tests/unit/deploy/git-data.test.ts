import { describe, it, expect } from 'vitest';
import { pushAsSingleCommit, type GitDataApi } from '@/lib/deploy/git-data';

function fakeApi() {
    const calls: string[] = [];
    const api: GitDataApi = {
        async createBlob() {
            calls.push('blob');
            return `blob-${calls.length}`;
        },
        async createTree() {
            calls.push('tree');
            return 'tree-1';
        },
        async createCommit() {
            calls.push('commit');
            return 'commit-1';
        },
        async updateRef() {
            calls.push('ref');
        },
        async headSha() {
            return null;
        },
    };
    return { api, calls };
}

describe('pushAsSingleCommit', () => {
    it('uploads every file and makes exactly one commit', async () => {
        const { api, calls } = fakeApi();
        const files = [
            { path: 'index.html', content: '<h1>hi</h1>', encoding: 'utf-8' as const },
            { path: 'styles.css', content: 'body{}', encoding: 'utf-8' as const },
        ];

        const result = await pushAsSingleCommit(api, files, 'Publish My Site');

        expect(calls).toEqual(['blob', 'blob', 'tree', 'commit', 'ref']);
        expect(calls.filter((c) => c === 'commit')).toHaveLength(1);
        expect(result.commitSha).toBe('commit-1');
    });
});