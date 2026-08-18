import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

for (const path of ['.next/types', '.next/dev/types']) {
    rmSync(path, { recursive: true, force: true });
}

const NEEDED = [
    ['@playwright/test', 'the e2e specs in e2e/'],
    ['vitest', 'the unit and contract tests in tests/'],
];

const missing = NEEDED.filter(([pkg]) => !existsSync(join('node_modules', pkg)));

if (missing.length > 0) {
    console.error('');
    console.error('Dependencies are missing, so TypeScript cannot see their types.');
    console.error('');

    for (const [pkg, why] of missing) {
        console.error(`  ${pkg}  -- needed by ${why}`);
    }

    console.error('');
    console.error('This shows up as a wall of TS7031 "implicitly has an any type" errors on');
    console.error('things like ({ page }) or ({ request }). The types are fine; the package');
    console.error('is not installed.');
    console.error('');
    console.error('Fix it with:');
    console.error('  npm install');
    console.error('');
    console.error('Do not exclude e2e/ or tests/ from tsconfig.json to make it quiet -- that');
    console.error('turns off typechecking for everyone, including the pre-commit hook.');
    console.error('');

    process.exit(1);
}
