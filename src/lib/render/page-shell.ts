import type { ArtDirection } from '@/lib/contracts';
import { artDirectionCss } from './art-direction';
import { motionCss, motionJs } from './motion-assets';

export interface ShellOptions {
    title: string;
    description: string;
    lang: string;
    motionId: string;
    themeCss: string;
    body: string;
}

/**
 * D14 — the shell for a generated composition, with every art-direction dial
 * applied. `pageShell` still takes raw CSS for callers that have their own
 * (a forked template brings its own stylesheet); this is the composition path,
 * where the dials are the stylesheet.
 */
export function compositionShell(o: {
    title: string;
    description: string;
    lang: string;
    artDirection: ArtDirection;
    body: string;
}): string {
    return pageShell({
        title: o.title,
        description: o.description,
        lang: o.lang,
        motionId: o.artDirection.motionId,
        themeCss: artDirectionCss(o.artDirection),
        body: o.body,
    });
}

export function pageShell(o: ShellOptions): string {
    return `<!doctype html>
<html lang="${o.lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title}</title>
<meta name="description" content="${o.description}">
<script>document.documentElement.classList.remove('no-js')</script>
<style>
${o.themeCss}
${motionCss}
</style>
</head>
<body data-motion="${o.motionId}">
${o.body}
<script>
${motionJs}
</script>
</body>
</html>`;
}