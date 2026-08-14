import { describe, expect, it } from 'vitest';
import { flattenFiles, stepFile } from '@/lib/editor/file-tree-nav';
import type { TreeNode } from '@/lib/contracts';

const tree: TreeNode = {
    name: '',
    path: '',
    kind: 'dir',
    children: [
        { name: 'index.html', path: 'index.html', kind: 'file' },
        {
            name: 'css',
            path: 'css',
            kind: 'dir',
            children: [{ name: 'styles.css', path: 'css/styles.css', kind: 'file' }],
        },
        { name: 'app.js', path: 'app.js', kind: 'file' },
    ],
};

describe('file tree keyboard navigation (D18)', () => {
    it('flattens files in tree order', () => {
        expect(flattenFiles(tree)).toEqual(['index.html', 'css/styles.css', 'app.js']);
    });

    it('steps to the next and previous file and stops at the ends', () => {
        const paths = flattenFiles(tree);
        expect(stepFile(paths, 'index.html', 1)).toBe('css/styles.css');
        expect(stepFile(paths, 'app.js', 1)).toBe('app.js');
        expect(stepFile(paths, 'index.html', -1)).toBe('index.html');
        expect(stepFile(paths, null, 1)).toBe('index.html');
        expect(stepFile([], null, 1)).toBeNull();
    });
});
