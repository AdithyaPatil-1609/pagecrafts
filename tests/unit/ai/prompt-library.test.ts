import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildPromptLibrary } from '../../../scripts/prompt-library';
import { listTemplates } from '@/lib/ai/harness/templates';
import { SECTION_KEYS } from '@/lib/contracts';

const DOC = join(process.cwd(), 'docs/ai/PROMPT_LIBRARY.md');

describe('D19 — the prompt library reference', () => {
    it('is committed', () => {
        expect(existsSync(DOC), 'run `npm run prompts:doc`').toBe(true);
    });

    /**
     * The reason it is generated rather than written. A hand-maintained
     * inventory is out of date the first time someone adds a version, and a
     * stale reference is worse than none — it is the document people trust
     * while it lies. If this fails, run `npm run prompts:doc`.
     */
    it('matches what the generator produces — regenerate rather than edit', () => {
        expect(readFileSync(DOC, 'utf8')).toBe(buildPromptLibrary());
    });

    it('lists every prompt on disk', () => {
        const doc = buildPromptLibrary();
        for (const file of listTemplates()) {
            expect(doc, file).toContain(`\`${file}\``);
        }
    });

    it('names every section type in the guidance table', () => {
        const doc = buildPromptLibrary();
        for (const key of SECTION_KEYS) {
            expect(doc, key).toContain(`| ${key} |`);
        }
    });

    it('records which version each stage is actually running', () => {
        const doc = buildPromptLibrary();
        expect(doc).toContain('AI_PROMPT_PLAN');
        expect(doc).toContain('In use right now');
    });

    it('states the containment split, which is not visible in any prompt file', () => {
        const doc = buildPromptLibrary();
        expect(doc).toContain('Containment');
        expect(doc).toContain("the user's instruction");
        expect(doc).toContain('normalised slug');
    });

    it('lists every section content contract and its fields', () => {
        const doc = buildPromptLibrary();
        expect(doc).toContain('## Section content contracts');
        for (const key of SECTION_KEYS) {
            expect(doc, key).toContain(`| ${key} |`);
        }
        expect(doc).toContain('`phone?`');
        expect(doc).toContain('`heading` (text)');
    });

    it('publishes the art-direction dial vocabulary, including all eight themes', () => {
        const doc = buildPromptLibrary();
        expect(doc).toContain('## Art-direction dial vocabulary');
        expect(doc).toContain('`clinical-blue`');
        expect(doc).toContain('`tech-slate`');
        expect(doc).toContain('### Tone constraints');
        expect(doc).toContain('| formal |');
    });

    it('records the day-19 freeze as a process freeze, not a product freeze', () => {
        const doc = buildPromptLibrary();
        expect(doc).toContain('## Day-19 freeze');
        expect(doc).toContain('process freeze');
        expect(doc).toContain('hash-pinned');
        expect(doc).not.toMatch(/freeze the (whole )?product/i);
    });
});
