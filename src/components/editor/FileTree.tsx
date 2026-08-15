'use client';
import { useState, type KeyboardEvent } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { flattenFiles, stepFile } from '@/lib/editor/file-tree-nav';
import type { TreeNode } from '@/lib/contracts';

type Draft = { mode: 'create' } | { mode: 'rename'; path: string } | null;

function Node({
    node,
    depth,
    onMenu,
}: {
    node: TreeNode;
    depth: number;
    onMenu: (path: string, x: number, y: number) => void;
}) {
    const openFile = useEditorStore((s) => s.openFile);
    const activeFile = useEditorStore((s) => s.activeFile);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);

    if (node.kind === 'dir') {
        return (
            <div role="group" aria-label={node.name || 'Project files'}>
                {node.path && (
                    <div
                        className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground"
                        style={{ paddingLeft: depth * 12 + 8 }}
                    >
                        {node.name}
                    </div>
                )}
                {node.children?.map((c) => (
                    <Node
                        key={c.path}
                        node={c}
                        depth={node.path ? depth + 1 : depth}
                        onMenu={onMenu}
                    />
                ))}
            </div>
        );
    }

    const isActive = node.path === activeFile;
    const isDirty = dirtyPaths.includes(node.path);

    return (
        <button
            id={`tree-${node.path}`}
            role="treeitem"
            aria-selected={isActive}
            tabIndex={-1}
            onClick={() => openFile(node.path)}
            onContextMenu={(e) => {
                e.preventDefault();
                onMenu(node.path, e.clientX, e.clientY);
            }}
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
    const activeFile = useEditorStore((s) => s.activeFile);
    const openFile = useEditorStore((s) => s.openFile);
    const createFile = useEditorStore((s) => s.createFile);
    const renameFile = useEditorStore((s) => s.renameFile);
    const deleteFile = useEditorStore((s) => s.deleteFile);

    const [draft, setDraft] = useState<Draft>(null);
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [menu, setMenu] = useState<{ path: string; x: number; y: number } | null>(null);

    const files = flattenFiles(tree);

    function start(next: Draft, initial = '') {
        setDraft(next);
        setValue(initial);
        setError(null);
        setMenu(null);
    }

    function submit() {
        if (!draft) return;
        const err = draft.mode === 'create' ? createFile(value) : renameFile(draft.path, value);
        if (err) return setError(err.message);
        start(null);
    }

    function onTreeKey(e: KeyboardEvent<HTMLDivElement>) {
        if (draft) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = stepFile(files, activeFile, e.key === 'ArrowDown' ? 1 : -1);
            if (next) openFile(next);
        } else if (e.key === 'Home') {
            e.preventDefault();
            if (files[0]) openFile(files[0]);
        } else if (e.key === 'End') {
            e.preventDefault();
            if (files.length) openFile(files[files.length - 1]);
        } else if (e.key === 'Enter' && activeFile) {
            e.preventDefault();
            openFile(activeFile);
        }
    }

    return (
        <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-2 py-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Files</span>
                <button
                    onClick={() => start({ mode: 'create' })}
                    aria-label="New file"
                    className="rounded px-2 text-lg leading-none text-muted-foreground hover:bg-muted"
                >
                    +
                </button>
            </div>

            {draft && (
                <div className="border-b border-border px-2 py-2">
                    <input
                        autoFocus
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submit();
                            if (e.key === 'Escape') start(null);
                        }}
                        onBlur={submit}
                        placeholder="index.html"
                        aria-invalid={!!error}
                        className={`w-full rounded border px-2 py-1 text-sm outline-none ${error ? 'border-destructive' : 'border-border'
                            }`}
                    />
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </div>
            )}

            <div
                role="tree"
                aria-label="Project files"
                tabIndex={0}
                aria-activedescendant={activeFile ? `tree-${activeFile}` : undefined}
                onKeyDown={onTreeKey}
                className="flex-1 overflow-auto py-1 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
                {files.length ? (
                    tree?.children?.map((c) => (
                        <Node
                            key={c.path}
                            node={c}
                            depth={0}
                            onMenu={(path, x, y) => setMenu({ path, x, y })}
                        />
                    ))
                ) : (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No files yet. Click + to add one.
                    </p>
                )}
            </div>

            {menu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                    <div
                        className="fixed z-20 w-36 rounded-md border border-border bg-background py-1 text-sm shadow-lg"
                        style={{ top: menu.y, left: menu.x }}
                    >
                        <button
                            className="block w-full px-3 py-1 text-left hover:bg-muted"
                            onClick={() => start({ mode: 'rename', path: menu.path }, menu.path)}
                        >
                            Rename
                        </button>
                        <button
                            className="block w-full px-3 py-1 text-left text-destructive hover:bg-muted"
                            onClick={() => {
                                if (confirm(`Delete ${menu.path}?`)) deleteFile(menu.path);
                                setMenu(null);
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
