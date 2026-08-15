import { describe, expect, it } from 'vitest';
import { isLargeFile, LARGE_FILE_CHARS, LARGE_FILE_LINES, shouldHighlight } from '@/lib/editor/large-file';

describe('large-file editor path (D17)', () => {
    it('keeps ordinary files on the highlighted path', () => {
        expect(isLargeFile('hello\nworld')).toBe(false);
        expect(shouldHighlight('<h1>Hi</h1>')).toBe(true);
    });

    it('treats a long character count as large', () => {
        const content = 'a'.repeat(LARGE_FILE_CHARS);
        expect(isLargeFile(content)).toBe(true);
        expect(shouldHighlight(content)).toBe(false);
    });

    it('treats a tall file as large without scanning past the line cap', () => {
        const content = `${'x\n'.repeat(LARGE_FILE_LINES)}tail`;
        expect(isLargeFile(content)).toBe(true);
    });
});
