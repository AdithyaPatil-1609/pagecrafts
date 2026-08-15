import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor-store';

beforeEach(() => {
    const { vfs } = useEditorStore.getState();
    vfs.reset();
    vfs.seed({ 'index.html': '<h1>Old</h1>' });
    useEditorStore.setState({ projectId: 'p1', activeFile: 'index.html', pendingChange: null });
});

describe('keeping a suggested change', () => {
    it('writes the new text and clears the suggestion', () => {
        const store = useEditorStore.getState();

        store.proposeChange({
            path: 'index.html',
            after: '<h1>New</h1>',
            explanation: 'Updates the heading.',
        });
        useEditorStore.getState().acceptChange();

        expect(useEditorStore.getState().vfs.read('index.html')).toBe('<h1>New</h1>');
        expect(useEditorStore.getState().pendingChange).toBeNull();
    });

    it('marks the kept change as unsaved so it is stored', () => {
        const store = useEditorStore.getState();

        store.proposeChange({
            path: 'index.html',
            after: '<h1>New</h1>',
            explanation: 'Updates the heading.',
        });
        useEditorStore.getState().acceptChange();

        expect(useEditorStore.getState().vfs.dirtyPaths()).toContain('index.html');
    });
});

describe('discarding a suggested change', () => {
    it('leaves the file exactly as it was', () => {
        const store = useEditorStore.getState();

        store.proposeChange({
            path: 'index.html',
            after: '<h1>New</h1>',
            explanation: 'Updates the heading.',
        });
        useEditorStore.getState().rejectChange();

        expect(useEditorStore.getState().vfs.read('index.html')).toBe('<h1>Old</h1>');
        expect(useEditorStore.getState().pendingChange).toBeNull();
    });

    it('does not mark the file as unsaved', () => {
        const store = useEditorStore.getState();

        store.proposeChange({
            path: 'index.html',
            after: '<h1>New</h1>',
            explanation: 'Updates the heading.',
        });
        useEditorStore.getState().rejectChange();

        expect(useEditorStore.getState().vfs.dirtyPaths()).toEqual([]);
    });
});