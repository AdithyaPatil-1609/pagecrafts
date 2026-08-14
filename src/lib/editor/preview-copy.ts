/** User-facing preview copy — no file, stylesheet, or iframe language. */

export function friendlyPreviewIssue(message: string): string {
    if (/^No .+ in this project/.test(message)) {
        return 'Your site will show up here as you edit.';
    }
    if (message.startsWith('Missing stylesheet') || message.startsWith('Missing script')) {
        return 'Part of the page could not be shown.';
    }
    if (message.includes('too large')) {
        return 'This page is too large to preview.';
    }
    return 'This preview had a problem.';
}
