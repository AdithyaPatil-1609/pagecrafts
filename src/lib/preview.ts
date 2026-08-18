import { isOverPreviewLimit } from './preview-security';
import { PREVIEW_BOOTSTRAP_SCRIPT } from './preview-runtime';

export interface PreviewResult {
    html: string;
    warnings: string[];
}

const EXTERNAL = /^(https?:)?\/\/|^data:|^blob:|^#/i;

function normalize(ref: string): string {
    return ref.replace(/^\.\//, '').replace(/^\//, '').split(/[?#]/)[0] ?? '';
}

export function assemblePreview(
    files: Record<string, string>,
    entry = 'index.html',
): PreviewResult {
    const warnings: string[] = [];
    const source = files[entry];

    if (source === undefined) {
        return { html: '', warnings: [`No ${entry} in this project.`] };
    }

    let out = source.replace(/<link\b[^>]*>/gi, (tag) => {
        if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
        const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!href || EXTERNAL.test(href)) return tag;

        const css = files[normalize(href)];
        if (css === undefined) {
            warnings.push(`Missing stylesheet: ${href}`);
            return '';
        }
        return `<style>\n${css}\n</style>`;
    });

    out = out.replace(
        /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
        (tag, src: string) => {
            if (EXTERNAL.test(src)) return tag;

            const js = files[normalize(src)];
            if (js === undefined) {
                warnings.push(`Missing script: ${src}`);
                return '';
            }
            return `<script>\n${js}\n</script>`;
        },
    );

    if (isOverPreviewLimit(out)) {
        return { html: '', warnings: ['This preview is too large to display safely.'] };
    }

    return { html: out, warnings };
}

export function injectErrorHook(html: string): string {
    const head = html.match(/<head[^>]*>/i);
    if (!head || head.index === undefined) {
        return PREVIEW_BOOTSTRAP_SCRIPT + html;
    }
    const at = head.index + head[0].length;
    return html.slice(0, at) + PREVIEW_BOOTSTRAP_SCRIPT + html.slice(at);
}