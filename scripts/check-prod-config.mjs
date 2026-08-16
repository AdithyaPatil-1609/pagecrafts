#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

// D18. Reads .env.example as the list of what the app expects, then reports what is
// missing or still a placeholder in the environment this runs in. Run it locally with
// --env-file=.env.local, and in a Vercel shell to check production.

const EXAMPLE = '.env.example';

const OPTIONAL = new Set([
    'UNSPLASH_ACCESS_KEY',
    'AI_KILL_SWITCH',
    'AI_KILL_SWITCH_REASON',
    'NEXT_PUBLIC_TEMPLATE_THUMBNAIL_BASE',
    'E2E_WITH_AUTH',
]);

const PLACEHOLDER = /^(replace_me|changeme|your|base64-32-byte-key|iv\.tag\.ciphertext|<|xxx)/i;

if (!existsSync(EXAMPLE)) {
    console.error(`No ${EXAMPLE} to check against.`);
    process.exit(1);
}

const expected = readFileSync(EXAMPLE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim())
    .filter(Boolean);

const missing = [];
const placeholder = [];
const present = [];

for (const name of expected) {
    const value = process.env[name];

    if (!value || value.trim() === '') {
        (OPTIONAL.has(name) ? present : missing).push(name);
        continue;
    }

    if (PLACEHOLDER.test(value.trim())) placeholder.push(name);
    else present.push(name);
}

console.log(`checked ${expected.length} variables from ${EXAMPLE}`);
console.log(`  set        ${present.length}`);
console.log(`  missing    ${missing.length}`);
console.log(`  placeholder ${placeholder.length}`);

if (missing.length) {
    console.log('');
    console.log('MISSING');
    for (const name of missing) console.log(`  ${name}`);
}

if (placeholder.length) {
    console.log('');
    console.log('STILL THE EXAMPLE VALUE');
    for (const name of placeholder) console.log(`  ${name}`);
}

const rootDomain = process.env.PAGECRAFT_ROOT_DOMAIN;

if (rootDomain && rootDomain !== 'pagecrafts.in') {
    console.log('');
    console.log(`WARNING: PAGECRAFT_ROOT_DOMAIN is "${rootDomain}".`);
    console.log('The domain you own is pagecrafts.in. Published sites would get addresses');
    console.log('on a domain that is not yours.');
}

if (!rootDomain) {
    console.log('');
    console.log('WARNING: PAGECRAFT_ROOT_DOMAIN is unset, so the code falls back to');
    console.log('"pagecraft.in" -- singular, and not a domain you own.');
}

process.exit(missing.length + placeholder.length > 0 ? 1 : 0);
