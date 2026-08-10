import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { categorySchema } from '@/lib/contracts/schemas/ai';
import { MAX_CLASSIFY_CHARS } from '@/lib/contracts';

interface CorpusItem {
    id: string;
    vertical: string;
    expectedCategory: string;
    hasTemplate: boolean;
    prompt: string;
}

const corpus: CorpusItem[] = JSON.parse(
    readFileSync(join(process.cwd(), 'evals/corpus.json'), 'utf8'),
);

describe('evaluation corpus', () => {
    it('has the 30 prompts AC-F4-1 needs at D11', () => {
        expect(corpus.length).toBeGreaterThanOrEqual(30);
    });

    it('uses ids and verticals that are unique', () => {
        expect(new Set(corpus.map((c) => c.id)).size).toBe(corpus.length);
        expect(new Set(corpus.map((c) => c.vertical)).size).toBe(corpus.length);
    });

    it('names only categories the classifier can return', () => {
        for (const c of corpus) {
            expect(categorySchema.safeParse(c.expectedCategory).success, c.id).toBe(true);
        }
    });

    it('keeps every prompt inside the classify ceiling', () => {
        for (const c of corpus) {
            expect(c.prompt.length, c.id).toBeLessThanOrEqual(MAX_CLASSIFY_CHARS);
            expect(c.prompt.trim().length, c.id).toBeGreaterThan(0);
        }
    });

    // A corpus of clean prompts measures nothing useful — these must read like
    // something a real person typed, not a specification.
    it('reads like real typing: lowercase and unpunctuated', () => {
        for (const c of corpus) {
            expect(c.prompt[0], c.id).toBe(c.prompt[0].toLowerCase());
            expect(c.prompt.endsWith('.'), c.id).toBe(false);
        }
    });

    it('is mostly detailed prompts, with a location or a service list', () => {
        const detailed = corpus.filter((c) => c.prompt.split(/\s+/).length >= 12);
        expect(detailed.length).toBeGreaterThanOrEqual(corpus.length - 3);
    });

    // Deliberately kept: a near-empty prompt is the only way to exercise the
    // classifier's "unclear → other / general-business" path.
    it('keeps at least one deliberately vague prompt', () => {
        expect(corpus.some((c) => c.prompt.split(/\s+/).length <= 3)).toBe(true);
    });

    it('keeps most verticals without a hand-authored template', () => {
        const without = corpus.filter((c) => !c.hasTemplate).length;
        expect(without).toBeGreaterThan(corpus.length / 2);
    });

    it('spreads across categories rather than clustering on one', () => {
        const counts = new Map<string, number>();
        for (const c of corpus) counts.set(c.expectedCategory, (counts.get(c.expectedCategory) ?? 0) + 1);
        expect(counts.size).toBeGreaterThanOrEqual(12);
        expect(Math.max(...counts.values())).toBeLessThanOrEqual(corpus.length / 3);
    });
});
