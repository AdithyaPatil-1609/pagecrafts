import { describe, it, expect } from 'vitest';
import { loadTemplate, render, listTemplates } from '@/lib/ai/harness/templates';

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