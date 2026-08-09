import { describe, expect, it } from 'vitest';
import { compareText, describeChange } from '@/lib/compare';

describe('compareText', () => {
    it('reports nothing when the text is identical', () => {
        const result = compareText('a\nb\nc', 'a\nb\nc');

        expect(result.isEmpty).toBe(true);
        expect(result.addedCount).toBe(0);
        expect(result.removedCount).toBe(0);
    });

    it('reports a pure addition', () => {
        const result = compareText('a\nb', 'a\nb\nc');

        expect(result.addedCount).toBe(1);
        expect(result.removedCount).toBe(0);
        expect(result.lines.at(-1)).toEqual({ kind: 'added', text: 'c' });
    });

    it('reports a pure removal', () => {
        const result = compareText('a\nb\nc', 'a\nc');

        expect(result.addedCount).toBe(0);
        expect(result.removedCount).toBe(1);
        expect(result.lines).toContainEqual({ kind: 'removed', text: 'b' });
    });

    it('keeps the untouched lines around a change', () => {
        const result = compareText('one\ntwo\nthree', 'one\nTWO\nthree');

        expect(result.lines[0]).toEqual({ kind: 'same', text: 'one' });
        expect(result.lines.at(-1)).toEqual({ kind: 'same', text: 'three' });
        expect(result.addedCount).toBe(1);
        expect(result.removedCount).toBe(1);
    });
});

describe('describeChange', () => {
    it('uses no engineer words', () => {
        const sentence = describeChange(compareText('a', 'a\nb'));

        expect(sentence).toBe('Adds 1 new line.');
        expect(sentence).not.toMatch(/diff|patch|commit|hunk/i);
    });

    it('says nothing changed when nothing changed', () => {
        expect(describeChange(compareText('a', 'a'))).toBe('Nothing would change.');
    });
});