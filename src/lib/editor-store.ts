'use client';
import { create } from 'zustand';
import { VFS } from '@/lib/vfs';
import { validatePath, type PathError } from '@/lib/paths';
import { loadProjectFiles, saveProjectFiles, pickEntryFile } from '@/lib/project-source';
import { debounceTrigger } from '@/lib/debounce';
import { compareText } from '@/lib/compare';
import type { TreeNode } from '@/lib/contracts';

const vfs = new VFS();
const AUTOSAVE_DELAY_MS = 1500;

export interface PendingChange {
    path: string;
    before: string;
    after: string;
    explanation: string;
}

export interface ProposedChange {
    path: string;
    after: string;
    explanation: string;
}

interface EditorState {
    vfs: VFS;
    projectId: string | null;
    tree: TreeNode | null;
    activeFile: string | null;
    dirtyPaths: string[];
    advanced: boolean;
    loading: boolean;
    loadError: string | null;
    saving: boolean;
    saveError: string | null;
    lastSavedAt: string | null;
    pendingChange: PendingChange | null;
    loadProject: (projectId: string) => Promise<void>;
    openFile: (path: string) => void;
    writeActive: (content: string) => void;
    toggleAdvanced: () => void;
    refresh: () => void;
    createFile: (path: string) => PathError | null;
    renameFile: (from: string, to: string) => PathError | null;
    deleteFile: (path: string) => void;
    saveProject: () => Promise<void>;
    flushPendingSave: () => void;
    proposeChange: (proposed: ProposedChange) => void;
    acceptChange: () => void;
    rejectChange: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    vfs,
    projectId: null,
    tree: vfs.list(),
    activeFile: null,
    dirtyPaths: [],
    advanced: false,
    loading: true,
    loadError: null,
    saving: false,
    saveError: null,
    lastSavedAt: null,
    pendingChange: null,

    loadProject: async (projectId) => {
        autosave.cancel();
        set({
            loading: true,
            loadError: null,
            saveError: null,
            pendingChange: null,
            projectId,
        });

        const { files, updatedAt, error } = await loadProjectFiles(projectId);

        if (error) {
            set({ loading: false, loadError: error });
            return;
        }

        const { vfs } = get();
        vfs.reset();
        vfs.seed(files);

        set({
            activeFile: pickEntryFile(vfs.paths()),
            lastSavedAt: updatedAt,
            loading: false,
        });
    },

    openFile: (path) => {
        autosave.flush();
        set({ activeFile: path });
    },

    writeActive: (content) => {
        const { vfs, activeFile } = get();
        if (activeFile) vfs.write(activeFile, content);
        autosave.trigger();
    },

    toggleAdvanced: () => {
        autosave.flush();
        set((s) => ({ advanced: !s.advanced }));
    },

    refresh: () => set({ tree: vfs.list(), dirtyPaths: vfs.dirtyPaths() }),

    createFile: (path) => {
        const { vfs } = get();
        const err = validatePath(path, vfs.paths());
        if (err) return err;
        const clean = path.trim();
        vfs.write(clean, '');
        set({ activeFile: clean });
        autosave.flush();
        return null;
    },

    renameFile: (from, to) => {
        const { vfs, activeFile } = get();
        const err = validatePath(to, vfs.paths().filter((p) => p !== from));
        if (err) return err;
        const clean = to.trim();
        vfs.rename(from, clean);
        if (activeFile === from) set({ activeFile: clean });
        autosave.flush();
        return null;
    },

    deleteFile: (path) => {
        const { vfs, activeFile } = get();
        vfs.delete(path);
        if (activeFile === path) set({ activeFile: vfs.paths()[0] ?? null });
        autosave.flush();
    },

    saveProject: async () => {
        const { vfs, projectId, saving, dirtyPaths } = get();

        if (saving || !projectId || dirtyPaths.length === 0) return;

        set({ saving: true, saveError: null });

        const { updatedAt, error } = await saveProjectFiles(projectId, vfs.toMap());

        if (error) {
            set({ saving: false, saveError: error });
            return;
        }

        vfs.markClean();
        set({ saving: false, lastSavedAt: updatedAt });
    },

    flushPendingSave: () => autosave.flush(),

    proposeChange: (proposed) => {
        const { vfs } = get();
        const before = vfs.read(proposed.path);

        if (before === null) return;

        const compared = compareText(before, proposed.after);
        if (compared.isEmpty) return;

        set({
            pendingChange: {
                path: proposed.path,
                before,
                after: proposed.after,
                explanation: proposed.explanation,
            },
            activeFile: proposed.path,
        });
    },

    acceptChange: () => {
        const { vfs, pendingChange } = get();
        if (!pendingChange) return;

        vfs.write(pendingChange.path, pendingChange.after);
        set({ pendingChange: null });
    },

    rejectChange: () => set({ pendingChange: null }),
}));

const autosave = debounceTrigger(() => {
    useEditorStore.getState().saveProject();
}, AUTOSAVE_DELAY_MS);

vfs.subscribe(() => useEditorStore.getState().refresh());