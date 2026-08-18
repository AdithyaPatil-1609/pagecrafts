import { describe, expect, it } from 'vitest';
import { isOverPreviewLimit, PREVIEW_IFRAME_SANDBOX, withPreviewCsp } from '@/lib/preview-security';

describe('withPreviewCsp', () => {
    it('injects a CSP meta tag that blocks outbound connections', () => {
        const html = '<html><head><title>x</title></head><body></body></html>';
        const result = withPreviewCsp(html);

        expect(result).toContain('Content-Security-Policy');
        expect(result).toContain("connect-src 'none'");
        expect(result).toContain("form-action 'none'");
    });

    it('still works when there is no head tag', () => {
        const result = withPreviewCsp('<body>hi</body>');
        expect(result).toContain('Content-Security-Policy');
    });
});

describe('PREVIEW_IFRAME_SANDBOX', () => {
    it('does not combine scripts with same-origin', () => {
        expect(PREVIEW_IFRAME_SANDBOX).toContain('allow-scripts');
        expect(PREVIEW_IFRAME_SANDBOX).toContain('allow-forms');
        expect(PREVIEW_IFRAME_SANDBOX).not.toContain('allow-same-origin');
    });
});

describe('isOverPreviewLimit', () => {
    it('is false for a normal-sized page', () => {
        expect(isOverPreviewLimit('<h1>hello</h1>')).toBe(false);
    });

    it('is true for something far too large', () => {
        const huge = 'x'.repeat(4_000_000);
        expect(isOverPreviewLimit(huge)).toBe(true);
    });
});