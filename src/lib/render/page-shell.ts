import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/lib/render');

const motionCss = readFileSync(join(DIR, 'motion.css'), 'utf8');
const motionJs = readFileSync(join(DIR, 'motion.js'), 'utf8');

export interface ShellOptions {
    title: string;
    description: string;
    lang: string;
    motionId: string;
    themeCss: string;
    body: string;
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