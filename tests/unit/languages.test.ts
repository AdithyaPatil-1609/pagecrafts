import { describe, it, expect } from 'vitest';
import { extensionOf, languageFor } from '@/lib/languages';

describe('extensionOf', () => {
    it('reads the extension from a nested path', () => {
        expect(extensionOf('css/styles.css')).toBe('css');
    });

    it('ignores capital letters', () => {
        expect(extensionOf('INDEX.HTML')).toBe('html');
    });

    it('returns empty when there is no extension', () => {
        expect(extensionOf('LICENSE')).toBe('');
    });

    it('does not mistake a dot in a folder name for an extension', () => {
        expect(extensionOf('v1.0/README')).toBe('');
    });
});

describe('languageFor', () => {
    it('returns one language for a known type', () => {
        expect(languageFor('index.html')).toHaveLength(1);
    });

    it('returns nothing for an unknown type', () => {
        expect(languageFor('notes.txt')).toEqual([]);
    });
});