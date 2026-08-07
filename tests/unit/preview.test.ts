import { describe, it, expect } from 'vitest';
import { assemblePreview } from '@/lib/preview';

describe('assemblePreview', () => {
    it('inlines a local stylesheet', () => {
        const { html, warnings } = assemblePreview({
            'index.html': '<link rel="stylesheet" href="styles.css"><h1>hi</h1>',
            'styles.css': 'h1 { color: red; }',
        });
        expect(html).toContain('<style>');
        expect(html).toContain('color: red');
        expect(html).not.toContain('<link');
        expect(warnings).toEqual([]);
    });

    it('leaves external references alone', () => {
        const cdn = '<link rel="stylesheet" href="https://cdn.example.com/a.css">';
        const { html } = assemblePreview({ 'index.html': cdn });
        expect(html).toBe(cdn);
    });

    it('warns about a missing stylesheet instead of throwing', () => {
        const { html, warnings } = assemblePreview({
            'index.html': '<link rel="stylesheet" href="gone.css">',
        });
        expect(warnings[0]).toContain('gone.css');
        expect(html).not.toContain('gone.css');
    });

    it('inlines a local script', () => {
        const { html } = assemblePreview({
            'index.html': '<script src="app.js"></script>',
            'app.js': 'console.log(1);',
        });
        expect(html).toContain('console.log(1);');
        expect(html).not.toContain('src="app.js"');
    });

    it('handles a leading ./ in the path', () => {
        const { warnings } = assemblePreview({
            'index.html': '<link rel="stylesheet" href="./styles.css">',
            'styles.css': 'body{}',
        });
        expect(warnings).toEqual([]);
    });

    it('warns when there is no entry file at all', () => {
        const { html, warnings } = assemblePreview({ 'styles.css': 'body{}' });
        expect(html).toBe('');
        expect(warnings[0]).toContain('index.html');
    });
});