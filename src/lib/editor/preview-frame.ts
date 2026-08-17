/**
 * Preview HTML must not use iframe srcDoc.
 *
 * A srcDoc document inherits the editor URL as its base, so in-page links
 * like href="#what-we-shoot" navigate the iframe to /editor/<id>#… .
 * That request is framed (X-Frame-Options: DENY) and shows up as
 * "localhost refused to connect" in the Your site pane.
 *
 * A blob: URL gives the preview its own document URL, so hash links stay
 * inside the preview.
 */
export function previewDocumentUrl(html: string): string | null {
    if (!html.trim()) return null;
    return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}
