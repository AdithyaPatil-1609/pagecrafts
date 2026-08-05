'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs';
import { SEED_PROJECT } from '@/lib/seed';
import type { TreeNode } from '@/lib/contracts';

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
}

export const useEditorStore = create<EditorState>((set, get) => ({
    vfs,
    tree: vfs.list(),
    activeFile: 'index.html',
    dirtyPaths: vfs.dirtyPaths(),
    advanced: false,

    openFile: (path) => set({ activeFile: path }),

    writeActive: (content) => {
        const { vfs, activeFile } = get();
        if (activeFile) vfs.write(activeFile, content);
    },

    toggleAdvanced: () => set((s) => ({ advanced: !s.advanced })),

    refresh: () => set({ tree: vfs.list(), dirtyPaths: vfs.dirtyPaths() }),

    saveProject: () => {
        const { dirtyPaths } = get();
        if (dirtyPaths.length === 0) return;
        console.log('save', dirtyPaths);
    },
}));

vfs.subscribe(() => useEditorStore.getState().refresh());