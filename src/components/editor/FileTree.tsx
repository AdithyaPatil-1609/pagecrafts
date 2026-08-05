'use client';
import { useEditorStore } from '@/lib/editor-store';
import type { TreeNode } from '@/shared-types';

function Node({ node, depth }: { node: TreeNode; depth: number }) {
    const openFile = useEditorStore((s) => s.openFile);
    const activeFile = useEditorStore((s) => s.activeFile);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);

    if (node.kind === 'dir') {
        return (
            <div>
                {node.path && (
                    <div
                        className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground"
                        style={{ paddingLeft: depth * 12 + 8 }}
                    >
                        {node.name}
                    </div>
                )}
                {node.children?.map((c) => (
                    <Node key={c.path} node={c} depth={node.path ? depth + 1 : depth} />
                ))}
            </div>
        );
    }

    const isActive = node.path === activeFile;
    const isDirty = dirtyPaths.includes(node.path);

    return (
        <button
            onClick={() => openFile(node.path)}
            style={{ paddingLeft: depth * 12 + 8 }}
            className={`flex w-full items-center justify-between py-1 pr-2 text-left text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''
                }`}
        >
            <span className="truncate">{node.name}</span>
            {isDirty && (
                <span
                    aria-label="Unsaved changes"
                    className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
            )}
        </button>
    );
}

export default function FileTree() {
    const tree = useEditorStore((s) => s.tree);
    return <div className="py-1">{tree?.children?.map((c) => <Node key={c.path} node={c} depth={0} />)}</div>;
}