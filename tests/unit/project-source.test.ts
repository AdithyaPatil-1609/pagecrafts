import { describe, it, expect } from 'vitest';
import { loadProjectFiles, pickEntryFile } from '@/lib/project-source';

describe('pickEntryFile', () => {
    it('prefers index.html', () => {
        expect(pickEntryFile(['styles.css', 'index.html', 'about.html'])).toBe('index.html');
    });

    it('falls back to the first file in order', () => {
        expect(pickEntryFile(['styles.css', 'about.html'])).toBe('about.html');
    });

    it('returns null for an empty project', () => {
        expect(pickEntryFile([])).toBeNull();
    });

    it('does not change the array it was given', () => {
        const paths = ['b.html', 'a.html'];
        pickEntryFile(paths);
        expect(paths).toEqual(['b.html', 'a.html']);
    });
});

describe('loadProjectFiles', () => {
    it('returns an error when no project is requested', async () => {
        const { files, error } = await loadProjectFiles('');
        expect(error).toBeTruthy();
        expect(Object.keys(files)).toHaveLength(0);
    });

    it('returns files for a real project id', async () => {
        const { files, error } = await loadProjectFiles('demo');
        expect(error).toBeNull();
        expect(Object.keys(files).length).toBeGreaterThan(0);
    });
});