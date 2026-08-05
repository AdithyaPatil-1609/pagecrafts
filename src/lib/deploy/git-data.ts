import 'server-only';
import type { PublishFile } from '@/lib/contracts/deploy';

export interface TreeEntry {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
}

export interface GitDataApi {
  createBlob(content: string, encoding: 'utf-8' | 'base64'): Promise<string>;
  createTree(entries: TreeEntry[]): Promise<string>;
  createCommit(input: {
    message: string;
    treeSha: string;
    parentSha: string | null;
  }): Promise<string>;
  updateRef(ref: string, commitSha: string): Promise<void>;
  headSha(ref: string): Promise<string | null>;
}

export async function pushAsSingleCommit(
  api: GitDataApi,
  files: PublishFile[],
  message: string,
  ref = 'refs/heads/main',
): Promise<{ commitSha: string; ref: string }> {
  const entries: TreeEntry[] = [];

  for (const file of files) {
    const sha = await api.createBlob(file.content, file.encoding);
    entries.push({ path: file.path, mode: '100644', type: 'blob', sha });
  }

  const treeSha = await api.createTree(entries);
  const parentSha = await api.headSha(ref);
  const commitSha = await api.createCommit({ message, treeSha, parentSha });
  await api.updateRef(ref, commitSha);

  return { commitSha, ref };
}
