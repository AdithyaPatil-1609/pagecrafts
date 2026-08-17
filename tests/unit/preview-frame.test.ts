import { describe, expect, it } from 'vitest';
import { previewDocumentUrl } from '@/lib/editor/preview-frame';
import { TEMPLATES } from '@/lib/templates';

describe('previewDocumentUrl', () => {
    it('returns null when there is nothing to show', () => {
        expect(previewDocumentUrl('')).toBeNull();
        expect(previewDocumentUrl('   \n')).toBeNull();
    });

    it('builds a blob URL so hash links do not open the editor', async () => {
        const html = '<a href="#what-we-shoot">View portfolio</a><section id="what-we-shoot"></section>';
        const url = previewDocumentUrl(html);

        expect(url).toMatch(/^blob:/);
        expect(new URL(url!).protocol).toBe('blob:');
        expect(url).not.toContain('/editor/');

        const body = await fetch(url!).then((res) => res.text());
        expect(body).toContain('href="#what-we-shoot"');
        expect(body).toContain('id="what-we-shoot"');

        URL.revokeObjectURL(url!);
    });

    it('keeps the Photography Studio CTA on a blob, not /editor', async () => {
        const studio = TEMPLATES.find((t) => t.id === 'photography-studio');
        expect(studio).toBeDefined();
        const html = studio!.files['index.html'] ?? '';
        expect(html).toContain('href="#what-we-shoot"');

        const url = previewDocumentUrl(html);
        expect(url).toMatch(/^blob:/);
        expect(url).not.toContain('/editor/');

        URL.revokeObjectURL(url!);
    });
});
