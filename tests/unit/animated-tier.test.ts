import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { motifFor } from '@/lib/ai/generate/motion-motif';

// The Animated look is the Rs 999 tier. Two things made it worth less than the free one:
// a headline that got cut mid-word, and a palette that was the same hot pink for every
// business on earth. Both are one CSS block, so both are checkable here.

const CSS = readFileSync(join(process.cwd(), 'src/lib/ai/generate/to-files.ts'), 'utf8');

function rule(selector: string): string {
    const start = CSS.indexOf(selector);
    if (start === -1) return '';
    return CSS.slice(start, CSS.indexOf('}', start));
}

describe('the animated hero headline', () => {
    const hero = rule('[data-style="motion"] [data-type="hero"] h1 {');

    it('is never wider than the box it sits in', () => {
        // 12ch was the bug: "1947 Restaurant - Pure Veg Restaurant" is 37 characters and
        // simply ran off the edge.
        expect(hero).toContain('min(16ch, 100%)');
        expect(hero).not.toContain('max-width: 12ch');
    });

    it('is told to wrap, so a long trading name cannot overflow', () => {
        expect(hero).toContain('overflow-wrap: break-word');
        expect(hero).toContain('text-wrap: balance');
    });

    it('starts small enough on a phone to have somewhere to wrap to', () => {
        const [, min] = hero.match(/font-size:\s*clamp\(([^,]+),/) ?? [];
        expect(min?.trim()).toBe('2.4rem');
    });
});

describe('the animated palette follows the business', () => {
    it('gives a different accent to the trades most likely to buy this tier', () => {
        const accents = new Map<string, string>();

        for (const motif of ['steam', 'tooth', 'leaf', 'scale', 'flame', 'coin']) {
            const [, accent] = CSS.match(
                new RegExp(`body:has\\(\\[data-motif="${motif}"\\]\\)[^}]*--accent:\\s*(#[0-9a-f]{6})`, 'i'),
            ) ?? [];

            expect(accent, `${motif} has no accent of its own`).toBeTruthy();
            accents.set(motif, accent!);
        }

        // The point of the change: not one of them shares a colour.
        expect(new Set(accents.values()).size).toBe(accents.size);
    });

    it('covers every motif the classifier can pick, so none falls back to pink', () => {
        const declared = [...CSS.matchAll(/body:has\(\[data-motif="([a-z]+)"\]\)/g)].map((m) => m[1]);

        for (const [vertical, motif] of [
            ['restaurant', 'steam'],
            ['dental clinic', 'tooth'],
            ['yoga studio', 'leaf'],
            ['law firm', 'scale'],
            ['gym', 'flame'],
            ['sweet shop', 'jalebi'],
        ] as const) {
            expect(motifFor(vertical), `${vertical} picks the wrong motif`).toBe(motif);
            expect(declared, `${motif} has no palette`).toContain(motif);
        }
    });

    it('leaves no fixed violet in the canvas behind the motif', () => {
        // The aurora used to glow the same purple whatever the trade, which is what made a
        // vegetarian restaurant look like a nightclub.
        const aurora = rule('[data-style="motion"] .motion-aurora {');

        expect(aurora).not.toMatch(/rgba\(124,\s*58,\s*237/);
        expect(aurora).toContain('var(--accent)');
    });
});
