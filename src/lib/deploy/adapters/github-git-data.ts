import 'server-only';
import type { GitDataApi, TreeEntry } from '../git-data';
import { gh, HostingError } from './github-client';

const shortRef = (ref: string) => ref.replace(/^refs\//, '');

export function gitDataFor(owner: string, repo: string): GitDataApi {
    const base = `/repos/${owner}/${repo}/git`;

    return {
        async createBlob(content, encoding) {
            const { data } = await gh<{ sha: string }>('POST', `${base}/blobs`, {
                content,
                encoding,
            });
            return data.sha;
        },

        async createTree(entries: TreeEntry[]) {
            const { data } = await gh<{ sha: string }>('POST', `${base}/trees`, {
                tree: entries,
            });
            return data.sha;
        },

        async createCommit({ message, treeSha, parentSha }) {
            const { data } = await gh<{ sha: string }>('POST', `${base}/commits`, {
                message,
                tree: treeSha,
                parents: parentSha ? [parentSha] : [],
            });
            return data.sha;
        },

        async updateRef(ref, commitSha) {
            await gh('PATCH', `${base}/refs/${shortRef(ref)}`, {
                sha: commitSha,
                force: false,
            });
        },

        async headSha(ref) {
            try {
                const { data } = await gh<{ object: { sha: string } }>(
                    'GET',
                    `${base}/ref/${shortRef(ref)}`,
                );
                return data.object.sha;
            } catch (error) {
                if (error instanceof HostingError && error.status === 404) return null;
                throw error;
            }
        },
    };
}