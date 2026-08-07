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

    return { html: out, warnings };
}

const ERROR_HOOK = `<script>
(function () {
  function send(msg) {
    try { parent.postMessage({ __pagecraft: true, message: String(msg) }, '*'); } catch (e) {}
  }
  window.addEventListener('error', function (e) { send(e.message); });
  window.addEventListener('unhandledrejection', function (e) { send(e.reason); });
})();
</script>`;

export function injectErrorHook(html: string): string {
    const head = html.match(/<head[^>]*>/i);
    return head ? html.replace(head[0], head[0] + ERROR_HOOK) : ERROR_HOOK + html;
}