# PageCraft Editor — Every File I Created, Explained

Days 1–4 · Frontend / Editor (R1) · all paths relative to the repo root

---

## The shape of it, in one picture

```
Browser memory (no server involved)
│
├── src/shared-types/files.ts ......... the agreed shapes: what a "file" is
│
├── src/lib/vfs/ ...................... THE ENGINE
│   ├── vfs.ts ....................... holds every file, tracks changes
│   ├── paths.ts ..................... rejects bad file names
│   ├── seed.ts ...................... the sample project to start from
│   └── preview.ts ................... turns the files into one viewable page
│
├── src/lib/editor/store.ts .......... the single source of truth for the screen
│
├── src/components/editor/ ........... WHAT YOU SEE
│   ├── EditorShell.tsx .............. decides the layout
│   ├── TopBar.tsx ................... project name, Advanced, Save
│   ├── ContentPanel.tsx ............. the simple editing panel (placeholder)
│   ├── FileTree.tsx ................. list of files, right-click menu
│   ├── CodePane.tsx ................. the code editor
│   ├── PreviewPane.tsx .............. the live website preview
│   ├── Skeletons.tsx ................ grey loading bars
│   └── cmTheme.ts ................... colours for the code editor
│
└── tests/unit/ ...................... proof the engine works
    ├── vfs.test.ts
    ├── paths.test.ts
    └── preview.test.ts
```

**The rule that shaped all of it:** components never touch the file engine directly. They read through the store. That one rule is why nothing gets out of sync.

---

# DAY 1 — the skeleton and the engine

## 1 · `src/shared-types/files.ts`

**Why it exists.** The whole team agreed on Day 1 what data looks like, and froze it. Everyone imports these shapes instead of inventing their own. I added the file-related ones, because the file system is my part.

**What it does.** Describes a file (its content, whether it's been changed, whether it's text or an image) and describes a folder tree. No behaviour — just definitions.

```ts
export type FileType = 'text' | 'binary';

export interface VFile {
    content: string;
    dirty: boolean;
    type: FileType;
}

export interface TreeNode {
    name: string;
    path: string;
    kind: 'file' | 'dir';
    children?: TreeNode[];
}
```

**Impact on the website.** None you can see — but if I rename a field here, every file that uses it stops compiling immediately. Mistakes get caught at build time instead of in front of a user.

---

## 2 · `src/lib/vfs/vfs.ts` — the most important file I wrote

**Why it exists.** When someone edits their website, we can't save to a database on every keystroke — it would be slow and cost money. So the project's files live in the browser's memory while you work.

**What it does.** It's a box of files. You can read one, write one, list them as a tree, rename or delete. It remembers which files you've changed since the last save. And critically, whenever anything changes, it **tells the screen to redraw**.

```ts
import type { VFile, FileType, TreeNode } from '@/shared-types';

type Listener = () => void;

export class VFS {
    private files = new Map<string, VFile>();
    private listeners = new Set<Listener>();

    subscribe(fn: Listener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private emit() {
        for (const fn of this.listeners) fn();
    }

    read(path: string): string | null {
        return this.files.get(path)?.content ?? null;
    }

    write(path: string, content: string, type: FileType = 'text'): void {
        this.files.set(path, { content, dirty: true, type });
        this.emit();
    }

    /** Load without marking dirty — for seeding and server-loaded data. */
    seed(map: Record<string, string>): void {
        for (const [path, content] of Object.entries(map)) {
            this.files.set(path, { content, dirty: false, type: 'text' });
        }
        this.emit();
    }

    delete(path: string): boolean {
        const existed = this.files.delete(path);
        if (existed) this.emit();
        return existed;
    }

    rename(from: string, to: string): boolean {
        const file = this.files.get(from);
        if (!file || this.files.has(to)) return false;
        this.files.delete(from);
        this.files.set(to, { ...file, dirty: true });
        this.emit();
        return true;
    }

    dirtyPaths(): string[] {
        return [...this.files.entries()].filter(([, f]) => f.dirty).map(([p]) => p);
    }

    paths(): string[] {
        return [...this.files.keys()];
    }

    toMap(): Record<string, string> {
        return Object.fromEntries([...this.files].map(([p, f]) => [p, f.content]));
    }

    markClean(): void {
        for (const [path, file] of this.files) {
            this.files.set(path, { ...file, dirty: false });
        }
        this.emit();
    }

    list(): TreeNode {
        const root: TreeNode = { name: '', path: '', kind: 'dir', children: [] };
        for (const path of [...this.files.keys()].sort()) {
            const parts = path.split('/');
            let node = root;
            parts.forEach((part, i) => {
                const isLeaf = i === parts.length - 1;
                const childPath = parts.slice(0, i + 1).join('/');
                let child = node.children!.find((c) => c.name === part);
                if (!child) {
                    child = {
                        name: part,
                        path: childPath,
                        kind: isLeaf ? 'file' : 'dir',
                        ...(isLeaf ? {} : { children: [] }),
                    };
                    node.children!.push(child);
                }
                node = child;
            });
        }
        return root;
    }
}
```

**The two ideas worth understanding:**

- **`write` marks dirty, `seed` does not.** Loading files from the server isn't a change. Typing is. That distinction is what makes the orange dots and the "2 unsaved changes" counter honest.
- **`list()` builds a tree from flat paths.** The files are stored flat (`"css/styles.css"` is just a string key). `list()` splits on `/` and builds the nested folder structure the sidebar draws.

**Impact on the website.** Everything. The file list, the code editor, the preview, the dirty dots, the Save button — every one of them reads from this. Nothing on screen would work without it.

---

## 3 · `src/lib/vfs/seed.ts`

**Why it exists.** On Day 1 there was no server and no database. The editor needed *something* to show.

```ts
export const SEED_PROJECT: Record<string, string> = {
    'index.html': `<!doctype html>
<html><head>
<meta charset="utf-8"><title>My Site</title>
<link rel="stylesheet" href="styles.css">
</head><body>
<h1>My Site</h1>
<p>Built with PageCraft.</p>
</body></html>`,
    'styles.css': `body { font-family: system-ui; margin: 3rem; color: #111; }
h1 { color: #4f46e5; }`,
};
```

**Impact.** This is the "My Site" page you see when you open the editor. Two files, deliberately — one HTML, one CSS — so the preview has to actually resolve a link between them rather than just showing one file.

**Later:** when the backend is ready, this gets replaced by a real fetch. Nothing else changes.

---

## 4 · `src/lib/editor/store.ts` — the single source of truth

**Why it exists.** Six components need to know the same things: which file is open, what's changed, is Advanced on. If each kept its own copy they'd drift apart. So there's one box everyone reads from.

**What it does.** Holds the current state, exposes actions to change it, and — the key line at the very bottom — subscribes to the file engine so any change there instantly refreshes the screen.

```ts
'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs/vfs';
import { SEED_PROJECT } from '@/lib/vfs/seed';
import { validatePath, type PathError } from '@/lib/vfs/paths';
import type { TreeNode } from '@/shared-types';

const vfs = new VFS();
vfs.seed(SEED_PROJECT);

interface EditorState {
    vfs: VFS;
    tree: TreeNode | null;
    activeFile: string | null;
    dirtyPaths: string[];
    advanced: boolean;
    loading: boolean;
    openFile: (path: string) => void;
    writeActive: (content: string) => void;
    toggleAdvanced: () => void;
    refresh: () => void;
    setLoaded: () => void;
    createFile: (path: string) => PathError | null;
    renameFile: (from: string, to: string) => PathError | null;
    deleteFile: (path: string) => void;
    saveProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    vfs,
    tree: vfs.list(),
    activeFile: 'index.html',
    dirtyPaths: vfs.dirtyPaths(),
    advanced: false,
    loading: true,
    openFile: (path) => set({ activeFile: path }),
    writeActive: (content) => {
        const { vfs, activeFile } = get();
        if (activeFile) vfs.write(activeFile, content);
    },
    toggleAdvanced: () => set((s) => ({ advanced: !s.advanced })),
    refresh: () => set({ tree: vfs.list(), dirtyPaths: vfs.dirtyPaths() }),
    setLoaded: () => set({ loading: false }),

    createFile: (path) => {
        const { vfs } = get();
        const err = validatePath(path, vfs.paths());
        if (err) return err;
        const clean = path.trim();
        vfs.write(clean, '');
        set({ activeFile: clean });
        return null;
    },

    renameFile: (from, to) => {
        const { vfs, activeFile } = get();
        const err = validatePath(to, vfs.paths().filter((p) => p !== from));
        if (err) return err;
        const clean = to.trim();
        vfs.rename(from, clean);
        if (activeFile === from) set({ activeFile: clean });
        return null;
    },

    deleteFile: (path) => {
        const { vfs, activeFile } = get();
        vfs.delete(path);
        if (activeFile === path) set({ activeFile: vfs.paths()[0] ?? null });
    },

    saveProject: () => {
        const { dirtyPaths } = get();
        if (dirtyPaths.length === 0) return;
        console.log('save', dirtyPaths);
    },
}));

vfs.subscribe(() => useEditorStore.getState().refresh());
```

**The last line is the trick.** `vfs.subscribe(...)` means: whenever a file changes anywhere in the app, recalculate the tree and the dirty list. That's why deleting a file in the sidebar instantly updates the preview, with no wiring between those two components.

**`createFile` and `renameFile` return an error instead of throwing one.** That's what lets the sidebar show "A file with that name already exists" in red under the input, instead of a browser alert.

**Impact.** Click a file and the code pane switches. Type and the dot appears. Toggle Advanced and the layout changes. All of it is this file.

---

## 5 · `src/components/editor/EditorShell.tsx`

**Why it exists.** Something has to decide which panes appear and in what order.

**The product decision baked into it:** by default you see a content panel and a preview — **no code, no file list**. One button reveals the developer view. That ordering is the entire product thesis: the customer is a shop owner, not a programmer.

```tsx
'use client';
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import TopBar from './TopBar';
import ContentPanel from './ContentPanel';
import PreviewPane from './PreviewPane';
import FileTree from './FileTree';
import CodePane from './CodePane';
import { TreeSkeleton, PaneSkeleton } from './Skeletons';

export default function EditorShell({ projectId }: { projectId: string }) {
    const advanced = useEditorStore((s) => s.advanced);
    const loading = useEditorStore((s) => s.loading);
    const setLoaded = useEditorStore((s) => s.setLoaded);
    const saveProject = useEditorStore((s) => s.saveProject);

    useEffect(() => {
        setLoaded();
    }, [setLoaded]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveProject();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [saveProject]);

    return (
        <div className="flex h-screen flex-col bg-background">
            <TopBar projectId={projectId} />
            <main className="flex min-h-0 flex-1">
                {advanced ? (
                    <>
                        <aside className="w-56 shrink-0 overflow-auto border-r border-border">
                            {loading ? <TreeSkeleton /> : <FileTree />}
                        </aside>
                        <section className="min-w-0 flex-1 overflow-auto border-r border-border">
                            {loading ? <PaneSkeleton /> : <CodePane />}
                        </section>
                        <section className="min-w-0 flex-1">
                            {loading ? <PaneSkeleton /> : <PreviewPane />}
                        </section>
                    </>
                ) : (
                    <>
                        <section className="w-[420px] shrink-0 overflow-auto border-r border-border">
                            {loading ? <PaneSkeleton /> : <ContentPanel />}
                        </section>
                        <section className="min-w-0 flex-1">
                            {loading ? <PaneSkeleton /> : <PreviewPane />}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
```

**`min-h-0` and `min-w-0` are not decoration.** Without them, flexible panes refuse to scroll and the preview spills off the bottom of the screen. Two small class names that took a while to learn.

**The second `useEffect`** is the Cmd/Ctrl-S shortcut. `preventDefault()` stops the browser opening its own "Save page as" dialog.

---

## 6 · `src/components/editor/TopBar.tsx`

**Why it exists.** The user needs to know which project they're in, whether they have unsaved work, and how to save it.

```tsx
'use client';
import { useEditorStore } from '@/lib/editor/store';

export default function TopBar({ projectId }: { projectId: string }) {
    const advanced = useEditorStore((s) => s.advanced);
    const toggleAdvanced = useEditorStore((s) => s.toggleAdvanced);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const saveProject = useEditorStore((s) => s.saveProject);

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-medium">{projectId}</span>
            <div className="flex items-center gap-3">
                {dirtyPaths.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {dirtyPaths.length} unsaved {dirtyPaths.length === 1 ? 'change' : 'changes'}
                    </span>
                )}
                <button
                    onClick={toggleAdvanced}
                    className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                    {advanced ? 'Exit Advanced' : 'Advanced'}
                </button>
                <button
                    disabled={dirtyPaths.length === 0}
                    onClick={saveProject}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-40"
                >
                    Save
                </button>
            </div>
        </header>
    );
}
```

**Impact.** Save is greyed out until something actually changes. The count is live. Both come free from `dirtyPaths` — no extra bookkeeping.

---

## 7 · `src/components/editor/ContentPanel.tsx`

**Why it exists.** The default view needed *something* in it for demos.

**Honest status: this is a placeholder.** Three hard-coded input boxes wired to nothing. Typing in them does not affect the site.

```tsx
'use client';

export default function ContentPanel() {
    return (
        <div className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-gray-500">Content</h2>
            {['Site title', 'Tagline', 'About'].map((label) => (
                <label key={label} className="block">
                    <span className="mb-1 block text-sm">{label}</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" />
                </label>
            ))}
        </div>
    );
}
```

**What it becomes.** The real version generates its fields from `contentSchema` — the frozen shape Pragna owns. One small component per field type (text, image, colour, list…), so adding a 26th template needs zero new UI code. I can't build it until a real schema example exists.

---

## 8 · `tests/unit/vfs.test.ts`

**Why it exists.** The file engine is the thing everything else stands on. If it breaks quietly, every feature breaks.

```ts
import { describe, it, expect, vi } from 'vitest';
import { VFS } from '@/lib/vfs/vfs';

describe('VFS', () => {
    it('write marks the file dirty and read returns it', () => {
        const vfs = new VFS();
        vfs.write('index.html', '<h1>hi</h1>');
        expect(vfs.read('index.html')).toBe('<h1>hi</h1>');
        expect(vfs.dirtyPaths()).toEqual(['index.html']);
    });

    it('seed does not mark dirty', () => {
        const vfs = new VFS();
        vfs.seed({ 'index.html': 'x' });
        expect(vfs.dirtyPaths()).toEqual([]);
    });

    it('list returns a nested tree', () => {
        const vfs = new VFS();
        vfs.seed({ 'index.html': '', 'css/styles.css': '' });
        const tree = vfs.list();
        expect(tree.children?.map((c) => c.name).sort()).toEqual(['css', 'index.html']);
        expect(tree.children?.find((c) => c.name === 'css')?.children?.[0]?.path)
            .toBe('css/styles.css');
    });

    it('rename moves content and delete removes it', () => {
        const vfs = new VFS();
        vfs.seed({ 'a.html': 'body' });
        expect(vfs.rename('a.html', 'b.html')).toBe(true);
        expect(vfs.read('a.html')).toBeNull();
        expect(vfs.read('b.html')).toBe('body');
        expect(vfs.delete('b.html')).toBe(true);
        expect(vfs.read('b.html')).toBeNull();
    });

    it('fires a change event on write', () => {
        const vfs = new VFS();
        const spy = vi.fn();
        vfs.subscribe(spy);
        vfs.write('x.txt', '1');
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
```

**Impact.** Run `npm test` and get an answer in under a second on whether the foundation still works.

---

# DAY 2 — file operations, loading states

## 9 · `src/lib/vfs/paths.ts`

**Why it exists.** Users type file names, and people type nonsense. Empty names, duplicate names, `../../etc/passwd`. Every one of those needs catching *before* it reaches the file engine.

```ts
export interface PathError {
    code: 'invalid_path' | 'duplicate_path';
    message: string;
}

const ILLEGAL = /[<>:"\\|?*\u0000-\u001f]/;

export function validatePath(path: string, existing: string[]): PathError | null {
    const p = path.trim();

    if (!p) return { code: 'invalid_path', message: 'Name cannot be empty.' };
    if (p.startsWith('/') || p.endsWith('/'))
        return { code: 'invalid_path', message: 'Name cannot start or end with a slash.' };
    if (p.includes('//'))
        return { code: 'invalid_path', message: 'Name cannot contain an empty folder.' };
    if (p.split('/').some((seg) => seg === '.' || seg === '..'))
        return { code: 'invalid_path', message: 'Name cannot contain "." or "..".' };
    if (ILLEGAL.test(p))
        return { code: 'invalid_path', message: 'Name contains invalid characters.' };
    if (existing.includes(p))
        return { code: 'duplicate_path', message: 'A file with that name already exists.' };

    return null;
}
```

**Returns `null` when everything's fine** — so calling code reads `if (err) return err;`. Simple.

**The `..` check is a security one.** Path traversal is how attackers escape a folder they're meant to be locked into. Blocking it here means a malformed name can never reach the server.

**Impact.** Try to create a file called `index.html` when one exists: red border, plain-English message under the box, nothing created.

---

## 10 · `src/components/editor/Skeletons.tsx`

**Why it exists.** A blank white flash while things load looks broken. Grey pulsing bars look like loading.

```tsx
function Bar({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export function TreeSkeleton() {
    return (
        <div className="space-y-2 p-3">
            <Bar className="h-3 w-4/5" />
            <Bar className="h-3 w-3/5" />
            <Bar className="h-3 w-2/3" />
        </div>
    );
}

export function PaneSkeleton() {
    return (
        <div className="space-y-3 p-4">
            <Bar className="h-3 w-3/4" />
            <Bar className="h-3 w-1/2" />
            <Bar className="h-3 w-2/3" />
            <Bar className="h-3 w-1/3" />
        </div>
    );
}
```

**`bg-muted` not `bg-gray-200`** — that's a design token, so it follows light/dark mode automatically.

**Impact.** Refresh the editor and you see a moment of grey bars instead of a white flash. Currently brief because the data is instant; it earns its keep when real loading arrives.

---

## 11 · `src/components/editor/FileTree.tsx` (rewritten from Day 1)

**Why it exists.** The list of files, and everything you can do to them.

**What it handles:** nested folders, active highlight, dirty dots, a `+` button to create, an inline input with red validation errors, and a right-click menu with Rename and Delete.

```tsx
'use client';
import { useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import type { TreeNode } from '@/shared-types';

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
                    <Node key={c.path} node={c} depth={node.path ? depth + 1 : depth} onMenu={onMenu} />
                ))}
            </div>
        );
    }

    const isActive = node.path === activeFile;
    const isDirty = dirtyPaths.includes(node.path);

    return (
        <button
            role="treeitem"
            aria-selected={isActive}
            onClick={() => openFile(node.path)}
            onContextMenu={(e) => {
                e.preventDefault();
                onMenu(node.path, e.clientX, e.clientY);
            }}
            style={{ paddingLeft: depth * 12 + 8 }}
            className={`flex w-full items-center justify-between py-1 pr-2 text-left text-sm hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`}
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
    const createFile = useEditorStore((s) => s.createFile);
    const renameFile = useEditorStore((s) => s.renameFile);
    const deleteFile = useEditorStore((s) => s.deleteFile);

    const [draft, setDraft] = useState<Draft>(null);
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [menu, setMenu] = useState<{ path: string; x: number; y: number } | null>(null);

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
                        className={`w-full rounded border px-2 py-1 text-sm outline-none ${error ? 'border-destructive' : 'border-border'}`}
                    />
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </div>
            )}

            <div role="tree" aria-label="Project files" className="flex-1 overflow-auto py-1">
                {tree?.children?.length ? (
                    tree.children.map((c) => (
                        <Node key={c.path} node={c} depth={0} onMenu={(path, x, y) => setMenu({ path, x, y })} />
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
```

**One `Draft` state handles both create and rename** — same input box, pre-filled when renaming. Less code, less to go wrong.

**`role="tree"` / `role="treeitem"` / `aria-selected`** are for screen readers. The dirty dot has `aria-label="Unsaved changes"` because a coloured circle means nothing if you can't see it.

**The invisible full-screen `div` behind the menu** is what closes it when you click elsewhere.

---

# DAY 3 — the real code editor

## 12 · `src/components/editor/cmTheme.ts`

**Why it exists.** CodeMirror ships with its own colours, which clash with the rest of the app.

**The trick:** every colour is `hsl(var(--token))` — the same variables the whole app uses. So the code editor follows light/dark mode automatically, with no second theme to maintain.

```ts
import { EditorView } from '@codemirror/view';

export const pagecraftTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: '1.6',
    },
    '.cm-content': { padding: '12px 0' },
    '.cm-gutters': {
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--muted-foreground))',
        border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.4)' },
    '.cm-activeLineGutter': {
        backgroundColor: 'hsl(var(--muted) / 0.4)',
        color: 'hsl(var(--foreground))',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'hsl(var(--primary))' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'hsl(var(--primary) / 0.2)',
    },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
        backgroundColor: 'hsl(var(--primary) / 0.15)',
        outline: '1px solid hsl(var(--primary) / 0.4)',
    },
});
```

---

## 13 · `src/components/editor/CodePane.tsx` (rewritten from Day 1)

**Why it exists.** Day 1 used a plain `<textarea>` — no line numbers, no colours. This is a real code editor.

**What it does.** Mounts CodeMirror 6, picks the right language mode from the file extension, writes edits back to the file engine on a short delay, and remembers where your cursor was in each file.

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { indentUnit } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { useEditorStore } from '@/lib/editor/store';
import { pagecraftTheme } from './cmTheme';

function languageFor(path: string) {
    if (path.endsWith('.html') || path.endsWith('.htm')) return [html()];
    if (path.endsWith('.css')) return [css()];
    if (path.endsWith('.js') || path.endsWith('.mjs')) return [javascript()];
    return [];
}

export default function CodePane() {
    const host = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cursors = useRef(new Map<string, number>());

    const vfs = useEditorStore((s) => s.vfs);
    const activeFile = useEditorStore((s) => s.activeFile);

    useEffect(() => {
        if (!host.current || !activeFile) return;

        const doc = vfs.read(activeFile) ?? '';
        const saved = cursors.current.get(activeFile) ?? 0;
        const positions = cursors.current;

        const state = EditorState.create({
            doc,
            selection: { anchor: Math.min(saved, doc.length) },
            extensions: [
                basicSetup,
                pagecraftTheme,
                indentUnit.of('  '),
                EditorView.lineWrapping,
                ...languageFor(activeFile),
                EditorView.updateListener.of((u) => {
                    if (!u.docChanged) return;
                    if (timer.current) clearTimeout(timer.current);
                    timer.current = setTimeout(() => {
                        if (vfs.read(activeFile) === null) return;
                        vfs.write(activeFile, u.state.doc.toString());
                    }, 150);
                }),
            ],
        });

        const view = new EditorView({ state, parent: host.current });

        return () => {
            positions.set(activeFile, view.state.selection.main.head);
            if (timer.current) {
                clearTimeout(timer.current);
                // don't resurrect a file that was deleted while it was open
                if (vfs.read(activeFile) !== null) {
                    vfs.write(activeFile, view.state.doc.toString());
                }
            }
            view.destroy();
        };
    }, [activeFile, vfs]);

    if (!activeFile) {
        return <div className="p-3 text-sm text-muted-foreground">No file open</div>;
    }

    return <div ref={host} className="h-full overflow-auto text-sm" />;
}
```

**Three things worth calling out:**

- **Debouncing (150ms).** Writing to the file engine on every keystroke would redraw the whole preview constantly. Waiting until you pause is the difference between smooth and juddering.
- **The write uses `vfs.write(activeFile, ...)`, not the store's `writeActive`.** A delayed write must go to *the file it came from* — if you switch files mid-delay, `writeActive` would put your text in the wrong file.
- **The cleanup flushes pending edits before unmounting**, so switching files fast doesn't lose your last few characters. **And it checks the file still exists first** — without that check, deleting the file you're editing instantly recreates it. That was a real bug, found during a demo run.

---

# DAY 4 — the real preview

## 14 · `src/lib/vfs/preview.ts`

**Why it exists.** Day 1's preview was a hack: it searched for the literal text `styles.css` and swapped it. Rename the file and it broke.

**What it does.** Takes all the project's files and assembles one self-contained page: local stylesheets and scripts get pulled inline, external CDN links are left alone, and anything missing produces a warning instead of a crash.

```ts
export interface PreviewResult {
    html: string;
    warnings: string[];
}

/** Anything we should leave alone — CDNs, data URIs, protocol-relative URLs. */
const EXTERNAL = /^(https?:)?\/\/|^data:|^blob:|^#/i;

function normalize(ref: string): string {
    return ref.replace(/^\.\//, '').replace(/^\//, '').split(/[?#]/)[0] ?? '';
}

export function assemblePreview(
    files: Record<string, string>,
    entry = 'index.html',
): PreviewResult {
    const warnings: string[] = [];
    const source = files[entry];

    if (source === undefined) {
        return { html: '', warnings: [`No ${entry} in this project.`] };
    }

    let out = source.replace(/<link\b[^>]*>/gi, (tag) => {
        if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
        const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!href || EXTERNAL.test(href)) return tag;

        const css = files[normalize(href)];
        if (css === undefined) {
            warnings.push(`Missing stylesheet: ${href}`);
            return '';
        }
        return `<style>\n${css}\n</style>`;
    });

    out = out.replace(
        /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
        (tag, src: string) => {
            if (EXTERNAL.test(src)) return tag;

            const js = files[normalize(src)];
            if (js === undefined) {
                warnings.push(`Missing script: ${src}`);
                return '';
            }
            return `<script>\n${js}\n</script>`;
        },
    );

    return { html: out, warnings };
}

const ERROR_HOOK = `<script>
(function () {
  function send(msg) {
    try { parent.postMessage({ __pagecraft: true, message: String(msg) }, '*'); } catch (e) {}
  }
  window.addEventListener('error', function (e) { send(e.message); });
  window.addEventListener('unhandledrejection', function (e) { send(e.reason); });
})();
</script>`;

/** Inject the error reporter into <head>, or at the top if there isn't one. */
export function injectErrorHook(html: string): string {
    const head = html.match(/<head[^>]*>/i);
    return head ? html.replace(head[0], head[0] + ERROR_HOOK) : ERROR_HOOK + html;
}
```

**Why inline everything?** The preview runs in a locked-down frame with no network access to our server. It can't fetch `styles.css` from anywhere — the file only exists in browser memory. So the CSS has to be *in* the document.

**`ERROR_HOOK` is how errors escape the sandbox.** The frame is deliberately locked out of our page, which also means we can't look inside it. So we plant a small listener that catches errors and shouts them out via `postMessage`.

**Impact.** Rename `styles.css` to `main.css`, update the link, and the preview keeps working. Delete it and you get a clear warning instead of a mysteriously unstyled page.

---

## 15 · `src/components/editor/PreviewPane.tsx` (rewritten from Day 1)

**Why it exists.** Shows the user's website as it will actually look.

**Safety:** `sandbox="allow-scripts"` with **no** `allow-same-origin`. The previewed page can run its own JavaScript but cannot read our cookies, our storage, or our page. It sits in what browsers call an opaque origin.

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { assemblePreview, injectErrorHook } from '@/lib/vfs/preview';

const DEBOUNCE_MS = 120;

export default function PreviewPane() {
    const vfs = useEditorStore((s) => s.vfs);
    const dirtyPaths = useEditorStore((s) => s.dirtyPaths);
    const tree = useEditorStore((s) => s.tree);

    const frame = useRef<HTMLIFrameElement>(null);
    const [preview, setPreview] = useState(() => {
        const r = assemblePreview(vfs.toMap());
        return { doc: injectErrorHook(r.html), warnings: r.warnings };
    });
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const last = useRef(preview.doc);

    useEffect(() => {
        const t = setTimeout(() => {
            const r = assemblePreview(vfs.toMap());
            const next = injectErrorHook(r.html);
            if (next === last.current) return;
            last.current = next;
            setPreview({ doc: next, warnings: r.warnings });
            setRuntimeError(null);
            setDismissed(false);
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [vfs, dirtyPaths, tree]);

    useEffect(() => {
        function onMessage(e: MessageEvent) {
            if (e.source !== frame.current?.contentWindow) return;
            const data = e.data as { __pagecraft?: boolean; message?: string };
            if (!data?.__pagecraft) return;
            setRuntimeError(data.message ?? 'Unknown error');
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    const issues = [...preview.warnings, ...(runtimeError ? [runtimeError] : [])];
    const showNotice = issues.length > 0 && !dismissed;

    return (
        <div className="relative h-full w-full">
            <iframe
                ref={frame}
                title="Preview"
                sandbox="allow-scripts"
                srcDoc={preview.doc}
                className="h-full w-full border-0 bg-white"
            />

            {showNotice && (
                <div
                    role="status"
                    className="absolute inset-x-3 bottom-3 rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-medium">Preview issue</p>
                            <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                {issues.slice(0, 3).map((m, i) => (
                                    <li key={i} className="truncate">{m}</li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => setDismissed(true)}
                            aria-label="Dismiss"
                            className="shrink-0 rounded px-1 text-muted-foreground hover:bg-muted"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

**`if (next === last.current) return;` is the anti-flicker line.** Changing `srcDoc` reloads the whole frame, which flashes. So we simply don't change it unless the page genuinely differs. Clicking around, switching files, toggling Advanced — none of those touch the preview any more.

**`e.source !== frame.current?.contentWindow` is a security check.** With an opaque origin you can't check where a message came from by origin — it's literally the string `"null"`. So we check it came from *our* frame object.

**The notice floats over the page rather than replacing it.** A missing stylesheet shouldn't hide the content that still renders fine.

**Timing:** 150ms (keystroke → file engine) + 120ms (file engine → reassemble) = about 270ms, inside the 300ms target the spec sets.

---

## 16 · `tests/unit/preview.test.ts` and `tests/unit/paths.test.ts`

Ten more tests covering the validator and the assembler — that external CDN links are left untouched, that a missing file warns instead of throwing, that duplicate names are rejected.

```ts
import { describe, it, expect } from 'vitest';
import { assemblePreview } from '@/lib/vfs/preview';

describe('assemblePreview', () => {
    it('inlines a local stylesheet', () => {
        const { html, warnings } = assemblePreview({
            'index.html': '<link rel="stylesheet" href="styles.css"><h1>hi</h1>',
            'styles.css': 'h1 { color: red; }',
        });
        expect(html).toContain('<style>');
        expect(html).toContain('color: red');
        expect(html).not.toContain('<link');
        expect(warnings).toEqual([]);
    });

    it('leaves external references alone', () => {
        const cdn = '<link rel="stylesheet" href="https://cdn.example.com/a.css">';
        const { html } = assemblePreview({ 'index.html': cdn });
        expect(html).toBe(cdn);
    });

    it('warns about a missing asset instead of throwing', () => {
        const { html, warnings } = assemblePreview({
            'index.html': '<link rel="stylesheet" href="gone.css">',
        });
        expect(warnings[0]).toContain('gone.css');
        expect(html).not.toContain('gone.css');
    });
});
```

---

# Files I changed rather than created

**`src/app/editor/[projectId]/page.tsx`** — was a placeholder saying "Editor for project demo". Now it reads the project id from the URL and hands it to the shell. The `await params` is required by Next.js 15.

**`src/shared-types/index.ts`** — added one line, `export * from './files';`, so everything imports from `@/shared-types`.

**`vitest.config.ts` → `vitest.config.mts`** — the test runner couldn't start at all because one of its plugins is ESM-only. Renaming the config forces Node to load it correctly. Nobody had noticed because CI doesn't run tests yet.

---

# What still isn't real, and why

| Thing | Status | Blocked on |
|---|---|---|
| **Save** | Logs to console. Dirty markers deliberately stay lit rather than pretending it saved | Adhyay's `PUT /projects/:id/files` |
| **Loading a project** | Hard-coded sample files | Same endpoint, the `GET` half |
| **Content panel** | Three placeholder inputs wired to nothing | A real `contentSchema` from Pragna |
| **Surviving refresh** | Everything resets | Persistence (week 2) |

---

# The four ideas behind all of it

1. **Keep the files in the browser.** Server round-trips per keystroke would be slow and expensive. Memory is instant.
2. **One source of truth.** Every component reads through the store. Nothing can disagree with anything else.
3. **Wait before reacting.** Debouncing on both the write and the re-render is what makes typing smooth instead of juddering.
4. **Never fail silently.** A bad file name gets a message under the box. A broken preview gets a notice over the page. A save that hasn't happened doesn't claim it has.
