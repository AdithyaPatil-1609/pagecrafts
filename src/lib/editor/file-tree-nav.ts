import type { TreeNode } from '@/lib/contracts';

export function flattenFiles(node: TreeNode | null | undefined): string[] {
    if (!node) return [];
    if (node.kind === 'file') return [node.path];
    return (node.children ?? []).flatMap(flattenFiles);
}

export function stepFile(
    paths: string[],
    current: string | null,
    direction: 1 | -1,
): string | null {
    if (paths.length === 0) return null;

    const index = current ? paths.indexOf(current) : -1;
    if (index === -1) return direction === 1 ? paths[0] : paths[paths.length - 1];

    const next = index + direction;
    if (next < 0 || next >= paths.length) return paths[index];
    return paths[next];
}
