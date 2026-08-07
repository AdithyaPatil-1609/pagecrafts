import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readDeployCredential } from '@/lib/deploy/credentials';

const secret = readDeployCredential();
const roots = process.argv.slice(2);
let matches = 0;

function scan(path: string): void {
    const info = statSync(path);

    if (info.isDirectory()) {
        for (const entry of readdirSync(path)) scan(join(path, entry));
        return;
    }

    if (info.size > 20_000_000) return;

    try {
        if (readFileSync(path, 'utf8').includes(secret)) {
            console.error('LEAK:', path);
            matches += 1;
        }
    } catch {
        // unreadable or binary; nothing to match
    }
}

for (const root of roots.length ? roots : ['.next', 'public']) {
    try {
        scan(root);
    } catch {
        console.warn('skipped (missing):', root);
    }
}

console.log(
    matches === 0
        ? 'clean: credential not found in scanned output'
        : `${matches} file(s) contain the credential`,
);

process.exit(matches === 0 ? 0 : 1);