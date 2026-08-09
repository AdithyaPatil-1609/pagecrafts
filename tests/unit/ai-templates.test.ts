import { describe, it, expect } from 'vitest';
import { loadTemplate, render, listTemplates } from '@/lib/ai/harness/templates';
import { registryVars } from '@/lib/ai/harness/registry-vars';

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

    // Block 3 — registry lists are merged in, so a template can name one without
    // its caller knowing, and no list is ever hand-copied into a prompt.
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

    // Guards against drift: a placeholder that is neither a registry list nor a
    // known per-call value is a typo that only shows up as a runtime throw.
    it('every placeholder is either a registry list or a known per-call value', () => {
        const perCall = new Set([
            'vertical', 'tone', 'prompt', 'recipe', 'text', 'sectionKey',
            'variant', 'brief', 'fields', 'instruction', 'content', 'customerWord',
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