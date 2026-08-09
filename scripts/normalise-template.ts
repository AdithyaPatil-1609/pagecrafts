import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { normaliseTemplate, type SourceTemplate } from '@/lib/templates/normalise';

// The sourcing pipeline's command line (D4).
//
//   npm run templates:normalise -- data/templates/sources/<id> [--out <file.json>]
//
// A source directory is the design's own files plus a `template.json` sidecar carrying what
// the files cannot tell us: who made it, under what licence, and where it came from. The
// sidecar is the provenance record — a directory without one, or with a blank licence, is
// refused here and never reaches the library (C-06).

const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const out = outFlag === -1 ? undefined : args[outFlag + 1];
const dir = args.find((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--out');

if (!dir) {
    console.error('usage: npm run templates:normalise -- <source-dir> [--out <file.json>]');
    process.exit(2);
}

// Everything in the directory except the sidecar is a template file, keyed by its path
// relative to the source root and always with forward slashes — FileMap paths are text
// paths, not this machine's paths.
function collect(root: string, path = root, files: Record<string, string> = {}) {
    for (const entry of readdirSync(path)) {
        const full = join(path, entry);
        if (statSync(full).isDirectory()) {
            collect(root, full, files);
            continue;
        }
        if (full === join(root, 'template.json')) continue;
        files[relative(root, full).split(sep).join('/')] = readFileSync(full, 'utf8');
    }
    return files;
}

let sidecar: Partial<SourceTemplate>;
try {
    sidecar = JSON.parse(readFileSync(join(dir, 'template.json'), 'utf8'));
} catch {
    console.error(`refused: ${dir}/template.json is missing or unreadable.`);
    console.error('It carries the provenance — id, name, license, sourceUrl (C-06).');
    process.exit(1);
}

const result = normaliseTemplate({ ...sidecar, files: collect(dir) } as SourceTemplate);

if (!result.ok) {
    console.error(`refused: ${dir}`);
    for (const issue of result.issues) console.error(`  - ${issue}`);
    process.exit(1);
}

for (const warning of result.warnings) console.warn(`  ! ${warning}`);

const target = out ?? join('data', 'templates', `${result.template.id}.json`);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(result.template, null, 2)}\n`, 'utf8');

const sections = result.template.contentSchema.sections;
const fields = sections.reduce((n, section) => n + section.fields.length, 0);

console.log(
    `normalised ${result.template.id}: ${Object.keys(result.template.files).length} file(s), ` +
    `${sections.length} section(s), ${fields} field(s), ${result.template.tier} tier, ` +
    `licence ${result.template.license} -> ${target}`,
);
