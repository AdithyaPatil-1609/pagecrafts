const PREVIEW_CSP = [
    "default-src 'none'",
    "img-src * data: blob:",
    "font-src * data:",
    "style-src 'unsafe-inline' *",
    "script-src 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'none'",
    "frame-src 'none'",
    "form-action 'none'",
].join('; ');

/**
 * Unique origin on purpose: scripts may run, forms may be filled, but the
 * preview must not inherit the editor origin. Never add allow-same-origin
 * alongside allow-scripts.
 */
export const PREVIEW_IFRAME_SANDBOX = 'allow-scripts allow-forms';

export const MAX_PREVIEW_BYTES = 3_000_000;

export function withPreviewCsp(html: string): string {
    const meta = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;
    const head = html.match(/<head[^>]*>/i);
    return head ? html.replace(head[0], head[0] + meta) : meta + html;
}

export function isOverPreviewLimit(html: string): boolean {
    return new TextEncoder().encode(html).length > MAX_PREVIEW_BYTES;
}