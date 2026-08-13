import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { categorySchema } from '@/lib/contracts/schemas/ai';
import { SECTION_KEYS, MAX_CLASSIFY_CHARS } from '@/lib/contracts';
import type { CorpusItem } from '../../../evals/grader/index';

const corpus: CorpusItem[] = JSON.parse(
    readFileSync(join(process.cwd(), 'evals/corpus-30.json'), 'utf8'),
);

const inGroup = (g: CorpusItem['group']) => corpus.filter((c) => c.group === g);

describe('corpus-30 — composition', () => {
    it('has exactly thirty verticals', () => {
        expect(corpus.length).toBe(30);
    });

    it('uses unique ids and verticals', () => {
        expect(new Set(corpus.map((c) => c.id)).size).toBe(30);
        expect(new Set(corpus.map((c) => c.vertical)).size).toBe(30);
    });

    /**
     * Eighteen of thirty is not a representative sample of businesses. It is a
     * representative sample of the thing that might not work — the claim that a
     * vertical with no hand-authored template still gets a good page.
     */
    it('weights the corpus to the claim under test', () => {
        expect(inGroup('no-template').length).toBe(18);
        expect(inGroup('template').length).toBe(8);
        expect(inGroup('adversarial').length).toBe(2);
        expect(inGroup('non-english').length).toBe(2);
    });

    it('keeps hasTemplate consistent with the group it sits in', () => {
        for (const c of inGroup('no-template')) expect(c.hasTemplate, c.id).toBe(false);
        for (const c of inGroup('template')) expect(c.hasTemplate, c.id).toBe(true);
        // The two vague prompts match no template by construction.
        for (const c of inGroup('adversarial')) expect(c.hasTemplate, c.id).toBe(false);
    });

    it('carries a control group, so the report is two numbers rather than one', () => {
        expect(corpus.filter((c) => c.hasTemplate).length).toBeGreaterThanOrEqual(8);
    });
});

describe('corpus-30 — expectations a machine can grade', () => {
    it('names only categories the classifier can return', () => {
        for (const c of corpus) {
            expect(c.expect.category.length, c.id).toBeGreaterThan(0);
            for (const cat of c.expect.category) {
                expect(categorySchema.safeParse(cat).success, `${c.id}: ${cat}`).toBe(true);
            }
        }
    });

    it('names only registered section keys, so the grader can decide', () => {
        const known = new Set<string>(SECTION_KEYS);
        for (const c of corpus) {
            for (const k of c.expect.mustHave) expect(known.has(k), `${c.id}: ${k}`).toBe(true);
            for (const k of c.expect.shouldNotHave) expect(known.has(k), `${c.id}: ${k}`).toBe(true);
        }
    });

    it('never requires and forbids the same section', () => {
        for (const c of corpus) {
            const overlap = c.expect.mustHave.filter((k) => c.expect.shouldNotHave.includes(k));
            expect(overlap, c.id).toEqual([]);
        }
    });

    it('asks every page for a hero', () => {
        for (const c of corpus) expect(c.expect.mustHave, c.id).toContain('hero');
    });

    it('forbids a menu on the verticals where a menu would be plainly wrong', () => {
        const dentist = corpus.find((c) => c.vertical === 'dental-clinic');
        expect(dentist?.expect.shouldNotHave).toContain('menu');
    });
});

describe('corpus-30 — prompts read like typing, not a specification', () => {
    it('stays inside the classify ceiling', () => {
        for (const c of corpus) {
            expect(c.prompt.length, c.id).toBeLessThanOrEqual(MAX_CLASSIFY_CHARS);
            expect(c.prompt.trim().length, c.id).toBeGreaterThan(0);
        }
    });

    it('keeps the two adversarial prompts genuinely vague', () => {
        for (const c of inGroup('adversarial')) {
            expect(c.prompt.split(/\s+/).length, c.id).toBeLessThanOrEqual(6);
        }
    });

    /** NFR-161: a business whose name is not written in Latin script. */
    it('carries a Devanagari and a Tamil business name', () => {
        const nonEnglish = inGroup('non-english');
        expect(nonEnglish.some((c) => /[ऀ-ॿ]/.test(c.prompt))).toBe(true);
        expect(nonEnglish.some((c) => /[஀-௿]/.test(c.prompt))).toBe(true);
    });

    it('mostly reads as lowercase typing rather than sentence case', () => {
        const sentenceCase = corpus.filter((c) => /^[A-Z]/.test(c.prompt));
        expect(sentenceCase.length).toBeLessThanOrEqual(3);
    });
});
