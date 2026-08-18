#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const BUNDLE = '.next/static';

// Anything not prefixed NEXT_PUBLIC_ is server-only. If its value appears in a file the
// browser downloads, a server module has been pulled into a client component -- the value
// is then readable by anyone with devtools, and rotating it is the only remedy.
const PUBLIC_PREFIX = 'NEXT_PUBLIC_';

const NEVER_PUBLIC = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SECRET_MASTER_KEY',
    'UPSTASH_REDIS_REST_TOKEN',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'CEREBRAS_API_KEY',
    'HOSTING_DEPLOY_CREDENTIAL',
    'UNSPLASH_ACCESS_KEY',
    'RAZORPAY_KEY_SECRET',
    'SENTRY_AUTH_TOKEN',
];

const SHAPES = [
    { name: 'Google / Gemini key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: 'Groq key', re: /\bgsk_[0-9A-Za-z]{40,}\b/ },
    { name: 'Cerebras key', re: /\bcsk-[0-9a-z]{40,}\b/ },
    { name: 'GitHub token', re: /\b(?:gh[pousr]_[0-9A-Za-z]{36,}|github_pat_[0-9A-Za-z_]{40,})\b/ },
    { name: 'private key block', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
];

const READABLE = ['.js', '.mjs', '.css', '.json', '.map', '.txt', '.html'];

function walk(dir) {
    const out = [];

    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);

        if (statSync(path).isDirectory()) out.push(...walk(path));
        else if (READABLE.includes(extname(path))) out.push(path);
    }

    return out;
}

function serviceRoleJwts(text) {
    const found = [];

    for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}\b/g)) {
        try {
            if (JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')).role === 'service_role') {
                found.push(match[0]);
            }
        } catch {
            continue;
        }
    }

    return found;
}

if (!existsSync(BUNDLE)) {
    console.error(`No ${BUNDLE} directory. Run "npm run build" first.`);
    process.exit(1);
}

const secrets = Object.entries(process.env)
    .filter(([name, value]) =>
        !name.startsWith(PUBLIC_PREFIX)
        && typeof value === 'string'
        && value.length >= 16
        && (NEVER_PUBLIC.includes(name) || /SECRET|TOKEN|PASSWORD|API_KEY|CREDENTIAL/.test(name)))
    .map(([name, value]) => ({ name, value }));

const files = walk(BUNDLE);
const findings = [];

for (const file of files) {
    const text = readFileSync(file, 'utf8');

    for (const { name, value } of secrets) {
        if (text.includes(value)) findings.push({ file, what: `the value of ${name}` });
    }

    for (const { name, re } of SHAPES) {
        if (re.test(text)) findings.push({ file, what: name });
    }

    for (const _ of serviceRoleJwts(text)) {
        findings.push({ file, what: 'a Supabase service_role JWT' });
    }
}

console.log(`client bundle: ${files.length} files scanned in ${BUNDLE}`);
console.log(`server-only values checked against it: ${secrets.length}`);

if (secrets.length === 0) {
    console.log('');
    console.log('WARNING: no server-only values were loaded, so the value check proved nothing.');
    console.log('Run this with the real environment, e.g. `node --env-file=.env.local ' + process.argv[1] + '`');
}

if (findings.length === 0) {
    console.log('');
    console.log('clean: no server secret found in anything the browser downloads');
    process.exit(0);
}

console.error('');
console.error('LEAK: a server-only value is in the browser bundle.');
console.error('');

for (const { file, what } of findings) {
    console.error(`  ${file}`);
    console.error(`    contains ${what}`);
}

console.error('');
console.error('A server module has been imported into a client component. Find the import,');
console.error('move the value behind a route, and rotate the key -- it must be treated as');
console.error('public from the moment it shipped.');
console.error('');

process.exit(1);
