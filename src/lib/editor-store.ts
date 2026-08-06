'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs';
import { SEED_PROJECT } from '@/lib/seed';
import type { TreeNode } from '@/lib/contracts';
import { validatePath, type PathError } from '@/lib/paths';

const vfs = new VFS();
vfs.seed(SEED_PROJECT);

interface EditorState {
    vfs: VFS;
    tree: TreeNode | null;
    activeFile: string | null;
    dirtyPaths: string[];
    advanced: boolean;
    openFile: (path: string) => void;
    writeActive: (content: string) => void;
    toggleAdvanced: () => void;
    refresh: () => void;
    saveProject: () => void;
    loading: boolean;
    setLoaded: () => void;
    createFile: (path: string) => PathError | null;
    renameFile: (from: string, to: string) => PathError | null;
    deleteFile: (path: string) => void;

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