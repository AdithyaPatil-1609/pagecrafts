import { describe, it, expect } from 'vitest';
import { toSlug, isReserved, uniqueSlug } from '@/lib/deploy/slug';

const alwaysFree = async () => false;

describe('slug', () => {
    it('lowercases and hyphenates a messy name', () => {
        expect(toSlug("Raj's Bakery & Cafe!")).toBe('raj-s-bakery-cafe');
    });

    it('cuts to 80 characters', () => {
        expect(toSlug('a'.repeat(200))).toHaveLength(80);
    });

    it('still returns something valid for a non-latin name', async () => {
        const slug = await uniqueSlug('नमस्ते', alwaysFree);
        expect(slug).toMatch(/^[a-z0-9-]+$/);
        expect(slug.length).toBeGreaterThan(0);
    });

    it('knows the reserved names', () => {
        expect(isReserved('www')).toBe(true);
        expect(isReserved('raj-bakery')).toBe(false);
    });

    it('sidesteps a reserved name', async () => {
        expect(await uniqueSlug('WWW', alwaysFree)).toBe('www-site');
    });

    it('adds a number when the name is taken', async () => {
        const taken = new Set(['bakery', 'bakery-2']);
        const slug = await uniqueSlug('Bakery', async (c) => taken.has(c));
        expect(slug).toBe('bakery-3');
    });
});