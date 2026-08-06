import { describe, it, expect } from 'vitest';
import { validatePath } from '@/lib/paths';

describe('validatePath', () => {
    it('accepts a normal name', () => {
        expect(validatePath('about.html', [])).toBeNull();
    });

    it('accepts a name inside a folder', () => {
        expect(validatePath('css/styles.css', [])).toBeNull();
    });

    it('rejects an empty name', () => {
        expect(validatePath('   ', [])?.code).toBe('invalid_path');
    });

    it('rejects a duplicate', () => {
        const err = validatePath('index.html', ['index.html']);
        expect(err?.code).toBe('duplicate_path');
        expect(err?.message).toContain('already exists');
    });

    it('rejects a duplicate that differs only by case', () => {
        expect(validatePath('Index.html', ['index.html'])?.code).toBe('duplicate_path');
    });

    it('rejects path traversal', () => {
        expect(validatePath('../secrets.txt', [])?.code).toBe('invalid_path');
    });

    it('rejects leading and trailing slashes', () => {
        expect(validatePath('/index.html', [])?.code).toBe('invalid_path');
        expect(validatePath('css/', [])?.code).toBe('invalid_path');
    });

    it('trims before checking for duplicates', () => {
        expect(validatePath('  index.html  ', ['index.html'])?.code).toBe('duplicate_path');
    });
});