import { parseComposition } from '@/lib/editor/parse-composition';
import { compositionToFiles } from '@/lib/ai/generate/to-files';

export interface PreviewPending {
    path: string;
    after: string;
}

/** Files Your site should render, including a suggestion that has not been kept. */
export function filesForPreview(
    files: Record<string, string>,
    pending: PreviewPending | null,
): Record<string, string> {
    const next = { ...files };
    if (!pending) return next;

    if (pending.path === 'composition.json') {
        const parsed = parseComposition(pending.after);
        if (parsed) {
            Object.assign(next, compositionToFiles(parsed));
            next['composition.json'] = pending.after;
            return next;
        }
    }

    next[pending.path] = pending.after;
    return next;
}
