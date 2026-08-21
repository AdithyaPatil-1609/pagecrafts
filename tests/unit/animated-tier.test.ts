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

describe('the animated hero shows the real photograph', () => {
    const slot = rule('[data-style="motion"] [data-type="hero"] .img-slot {');

    // The Rs 999 tier hid the photo the pipeline had already fetched and put a glowing SVG
    // in its place, so the paid look was the one selling a cartoon while the free look
    // showed a real room. That is most of why it read as cheap.
    it('does not hide the photo the free tier keeps', () => {
        expect(slot).not.toMatch(/display:\s*none/);
        expect(slot).toContain('display: block');
    });

    it('lays it full bleed behind the words rather than in a box', () => {
        expect(slot).toContain('position: absolute');
        expect(slot).toContain('inset: 0');
        expect(rule('[data-style="motion"] [data-type="hero"] .img-slot img {'))
            .toContain('object-fit: cover');
    });

    it('moves slowly, and holds still for anyone who asked it to', () => {
        expect(slot).toContain('pc-kenburns');
        expect(CSS).toContain('@keyframes pc-kenburns');

        const reduced = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
        expect(reduced).toContain('[data-style="motion"] [data-type="hero"] .img-slot');
    });

    it('darkens the photo under the type, or the headline is unreadable', () => {
        expect(rule('[data-style="motion"] [data-type="hero"]::after {')).toContain('linear-gradient');
    });

    // The motif was min(52vw, 540px) and the loudest thing on the page, louder than the
    // name of the business the page is for.
    it('demotes the motif so the business leads, not the icon', () => {
        const [, vw] = CSS.match(/\.motion-motif svg \{[^}]*width:\s*min\((\d+)vw/) ?? [];

        expect(Number(vw)).toBeLessThanOrEqual(30);
    });
});

describe('the animated hero column', () => {
    const copy = rule('[data-style="motion"] [data-type="hero"] .hero-copy {');

    // 18ch here was measured against .hero-copy's own 1rem font, not the headline's,
    // so the column was about 144px wide with a 105px headline inside it. The h1's
    // own max-width is in ch on purpose -- there it resolves against the h1's font.
    it('is sized in rem, not in characters of the wrong font', () => {
        expect(copy).not.toMatch(/max-width:\s*\d+ch/);
        expect(copy).toContain('min(52rem, 88vw)');
    });

    it('is wide enough that a two-word name never has to break', () => {
        const [, rem] = copy.match(/max-width:\s*min\((\d+)rem/) ?? [];

        expect(Number(rem)).toBeGreaterThanOrEqual(40);
    });
});

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

describe('the premium tier is given a photograph to show', () => {
    const STYLES = readFileSync(join(process.cwd(), 'src/lib/ai/generate/styles.ts'), 'utf8');

    // photos: false meant stampPhotoUrls skipped the Animated look entirely, so the hero
    // image slot was empty markup. Revealing it in CSS achieved nothing until this changed.
    it('asks for the hero photo rather than opting out', () => {
        const motion = STYLES.slice(STYLES.indexOf('motion: {'));
        const [, value] = motion.match(/photos:\s*([^,\n]+)/) ?? [];

        expect(value?.trim()).toBe("'hero'");
        expect(value?.trim()).not.toBe('false');
    });
});

describe('two people, or two attempts, do not get the same picture', () => {
    const RUNNER = readFileSync(join(process.cwd(), 'src/lib/ai/jobs/runner.ts'), 'utf8');

    it('reads across the results page instead of always taking the first', () => {
        expect(RUNNER).not.toMatch(/return items\[0\]\?\.fullUrl/);
        expect(RUNNER).toContain('pickIndex(');
    });

    it('varies by job, so generating again is not a duplicate', () => {
        expect(RUNNER).toContain('lookupPhoto(q, job.id)');
    });
});
