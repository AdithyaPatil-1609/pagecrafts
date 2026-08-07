'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs';
import { validatePath, type PathError } from '@/lib/paths';
import { loadProjectFiles, pickEntryFile } from '@/lib/project-source';
import type { TreeNode } from '@/lib/contracts';

const vfs = new VFS();

interface EditorState {
    vfs: VFS;
    tree: TreeNode | null;
    activeFile: string | null;
    dirtyPaths: string[];
    advanced: boolean;
    loading: boolean;
    loadError: string | null;
    loadProject: (projectId: string) => Promise<void>;
    openFile: (path: string) => void;
    writeActive: (content: string) => void;
    toggleAdvanced: () => void;
    refresh: () => void;
    createFile: (path: string) => PathError | null;
    renameFile: (from: string, to: string) => PathError | null;
    deleteFile: (path: string) => void;
    saveProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    vfs,
    tree: vfs.list(),
    activeFile: null,
    dirtyPaths: [],
    advanced: false,
    loading: true,
    loadError: null,

    loadProject: async (projectId) => {
        set({ loading: true, loadError: null });

        const { files, error } = await loadProjectFiles(projectId);

        if (error) {
            set({ loading: false, loadError: error });
            return;
        }

        const { vfs } = get();
        vfs.reset();
        vfs.seed(files);

        set({
            activeFile: pickEntryFile(vfs.paths()),
            loading: false,
        });
    },

    openFile: (path) => set({ activeFile: path }),

    writeActive: (content) => {
        const { vfs, activeFile } = get();
        if (activeFile) vfs.write(activeFile, content);
    },

    toggleAdvanced: () => set((s) => ({ advanced: !s.advanced })),

    refresh: () => set({ tree: vfs.list(), dirtyPaths: vfs.dirtyPaths() }),

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