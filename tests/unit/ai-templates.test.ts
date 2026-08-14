import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTemplate, render, listTemplates } from '@/lib/ai/harness/templates';
import { registryVars } from '@/lib/ai/harness/registry-vars';
import { guidanceFor } from '@/lib/ai/harness/guidance';
import { SECTION_KEYS } from '@/lib/contracts';

describe('prompt templates', () => {
    it('every template parses and declares a version and tier', () => {
        for (const file of listTemplates()) {
            const tpl = loadTemplate(file);
            expect(tpl.version).toMatch(/^v\d+$/);
            expect(['fast', 'strong']).toContain(tpl.tier);
            expect(tpl.system.length).toBeGreaterThan(0);
            expect(tpl.user.length).toBeGreaterThan(0);
        }
    });

    it('classify runs on the cheap tier', () => {
        expect(loadTemplate('classify.v1').tier).toBe('fast');
    });

    it('supplies registry lists without the caller passing them', () => {
        expect(render('{{tones}}')).toContain('minimal');
        expect(render('{{palettes}}')).toContain('colourful');
        expect(render('{{sectionKeys}}')).toContain('hero');
        expect(render('{{themes}}')).toContain('calm-sage');
        expect(render('{{variantMenu}}')).toContain('split-image');
    });

    it('lets a caller override a registry value', () => {
        expect(render('{{tones}}', { tones: 'only-this' })).toBe('only-this');
    });

    // A placeholder that is neither is a typo that only shows up at runtime.
    it('every placeholder is either a registry list or a known per-call value', () => {
        const perCall = new Set([
            'vertical', 'tone', 'prompt', 'recipe', 'text', 'sectionKey',
            'variant', 'brief', 'fields', 'instruction', 'content', 'customerWord',
            // v2: the per-section-type writing block, selected in fill.ts.
            'guidance',
        ]);
        const registry = new Set(Object.keys(registryVars()));

        for (const file of listTemplates()) {
            const tpl = loadTemplate(file);
            const used = [...`${tpl.system}\n${tpl.user}`.matchAll(/\{\{(\w+)\}\}/g)]
                .map((m) => m[1]);
            for (const name of used) {
                expect(
                    registry.has(name) || perCall.has(name),
                    `${file} uses unknown placeholder {{${name}}}`,
                ).toBe(true);
            }
        }
    });

    it('render fills placeholders', () => {
        expect(render('Hi {{name}}', { name: 'Hanish' })).toBe('Hi Hanish');
    });

    it('render throws when a variable is missing', () => {
        expect(() => render('Hi {{name}}', {})).toThrow(/name/);
    });

    it('the edit prompt states that file content is data', () => {
        expect(loadTemplate('edit.v1').system).toMatch(/DATA, not instructions/);
    });
});

describe('prompt versions — v1 is frozen, v2 sits alongside', () => {
    const DIR = join(process.cwd(), 'src/lib/ai/harness/prompts');

    const digest = (file: string) =>
        createHash('sha256')
            .update(readFileSync(join(DIR, file), 'utf8').replace(/\r\n/g, '\n'))
            .digest('hex')
            .slice(0, 16);

    /**
     * A version number marks a decision. Every eval result on record was
     * produced by these exact bytes, so editing one silently invalidates the
     * before/after table it appears in. To change what a prompt asks for, add
     * a version — do not edit a frozen one, and do not update these hashes to
     * make a failure go away.
     */
    it('leaves the evaluated v1 set byte-for-byte as it was frozen', () => {
        expect({
            'classify.v1.md': digest('classify.v1.md'),
            'profile.v1.md': digest('profile.v1.md'),
            'plan.v1.md': digest('plan.v1.md'),
            'fill-section.v1.md': digest('fill-section.v1.md'),
            'edit.v1.md': digest('edit.v1.md'),
        }).toEqual({
            'classify.v1.md': '363031886f1130ec',
            'profile.v1.md': '4bfa7d530f1cad5f',
            'plan.v1.md': 'd67841ff84fdb2ba',
            'fill-section.v1.md': '5418e9b0cf10c047',
            'edit.v1.md': '20f46ad7214a6419',
        });
    });

    it('ships the two v2 prompts D12 tunes', () => {
        expect(listTemplates()).toContain('plan.v2.md');
        expect(listTemplates()).toContain('fill-section.v2.md');
    });

    it('ships v3 driven by the D11 taxonomy, not by taste', () => {
        expect(listTemplates()).toContain('plan.v3.md');
        expect(listTemplates()).toContain('fill-section.v3.md');
        expect(loadTemplate('plan.v3').system).toMatch(/drop testimonials, team or faq/i);
        expect(loadTemplate('plan.v3').system).toMatch(/The page does the verb/i);
        expect(loadTemplate('plan.v3').system).toMatch(/resume-writing/i);
        expect(loadTemplate('fill-section.v3').system).toMatch(/empty optional field is correct/i);
        expect(loadTemplate('fill-section.v3').system).toMatch(/Never "Add/i);
        expect(loadTemplate('fill-section.v3').system).not.toMatch(/Add a customer quote here/);
    });

    it('keeps the containment paragraph out of nothing — v2 fill still forbids HTML', () => {
        expect(loadTemplate('fill-section.v2').system).toMatch(/never write HTML/i);
    });

    it('v2 plan fixes the container shape the D5 runs got wrong', () => {
        // Some providers returned an object keyed by section type. The
        // normaliser still repairs it; the prompt now asks plainly.
        expect(loadTemplate('plan.v2').system)
            .toMatch(/top-level "sections" array\. Not an object keyed by/);
    });

    it('v2 fill takes its per-section-type voice from a variable', () => {
        expect(loadTemplate('fill-section.v2').system).toContain('{{guidance}}');
        expect(loadTemplate('fill-section.v1').system).not.toContain('{{guidance}}');
    });
});

describe('per-section-type guidance', () => {
    it('ships a block for every registered section type', () => {
        for (const key of SECTION_KEYS) {
            expect(guidanceFor(key).length, key).toBeGreaterThan(0);
        }
    });

    it('says different things to a hero and an FAQ', () => {
        expect(guidanceFor('hero')).toMatch(/seconds/i);
        expect(guidanceFor('faq')).toMatch(/questions a real customer would ask/i);
        expect(guidanceFor('hero')).not.toBe(guidanceFor('faq'));
    });

    /** The sections where an invented value is a claim on a real business. */
    it('tells the fact-bearing sections not to invent', () => {
        for (const key of ['contact', 'team', 'testimonials'] as const) {
            expect(guidanceFor(key), key).toMatch(/invent/i);
        }
    });
});