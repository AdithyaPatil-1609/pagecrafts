import { describe, it, expect, vi } from 'vitest';
import { VFS } from '@/lib/vfs';

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
        expect(tree.children?.find((c) => c.name === 'css')?.children?.[0]?.path).toBe('css/styles.css');
    });

    it('reset empties the engine', () => {
        const vfs = new VFS();
        vfs.seed({ 'a.html': 'x' });
        vfs.reset();
        expect(vfs.paths()).toEqual([]);
    });

    it('rename moves content and delete removes it', () => {
        const vfs = new VFS();
        vfs.seed({ 'a.html': 'body' });
        expect(vfs.rename('a.html', 'b.html')).toBe(true);
        expect(vfs.read('a.html')).toBeNull();
        expect(vfs.read('b.html')).toBe('body');
        expect(vfs.delete('b.html')).toBe(true);
    });

    it('fires a change event on write', () => {
        const vfs = new VFS();
        const spy = vi.fn();
        vfs.subscribe(spy);
        vfs.write('x.txt', '1');
        expect(spy).toHaveBeenCalledTimes(1);
    });
});