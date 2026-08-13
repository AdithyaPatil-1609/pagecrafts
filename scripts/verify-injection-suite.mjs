#!/usr/bin/env node
/**
 * AC-F11-4 — proves the injection suite would catch a real regression.
 *
 * The in-suite mutation check (tests/injection/weakening.test.ts) proves every
 * sanitiser rule is load-bearing against the corpus. This proves the stronger,
 * blunter thing the acceptance criterion actually asks for: that a weakened
 * sanitiser committed to the tree makes the build fail.
 *
 * It edits the real source file, runs the real suite, asserts it goes red, and
 * puts the file back. Without this, a green suite only tells you the suite is
 * green today — not that it is watching anything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const SANITISER = join(process.cwd(), 'src/lib/ai/sanitise.ts');
const SUITE = ['vitest', 'run', 'tests/injection', '--silent'];

/** Drops the whole line declaring a named rule, the way a careless tidy-up would. */
const dropRule = (name) => (src) =>
    src.replace(new RegExp(`^\\s*\\['${name}',.*$\\n?`, 'm'), '');

/**
 * Each weakening removes one real defence. A weakening that another rule still
 * covers is not a regression and does not belong here — the script asserts that
 * each of these makes the build fail, so a masked one is a false alarm.
 */
const WEAKENINGS = [
    { name: 'drop the iframe rule', apply: dropRule('iframe') },
    { name: 'drop the object/embed rule', apply: dropRule('object-embed') },
    { name: 'drop the event-handler rule', apply: dropRule('event-handler') },
    { name: 'drop the javascript: url rule', apply: dropRule('javascript-url') },
    {
        // Both script rules together: they cover each other, so making only one
        // case-sensitive leaves the tag stripped by the other. Making both is a
        // real regression — `<ScRiPt>` would survive intact.
        name: 'make script matching case-sensitive',
        apply: (src) => src
            .replace("<\\/script\\s*>/gi]", "<\\/script\\s*>/g]")
            .replace("/<\\/?script\\b[^>]*>/gi]", "/<\\/?script\\b[^>]*>/g]"),
    },
    {
        name: 'let the event-handler rule match only double-quoted values',
        apply: (src) => src.replace(
            /\['event-handler',.*$/m,
            "['event-handler', /\\son[a-z]+\\s*=\\s*\"[^\"]*\"/gi],",
        ),
    },
];

const original = readFileSync(SANITISER, 'utf8');
let restored = false;

function restore() {
    if (restored) return;
    writeFileSync(SANITISER, original);
    restored = true;
}

// Put the file back even if this process is interrupted.
for (const signal of ['SIGINT', 'SIGTERM', 'uncaughtException']) {
    process.on(signal, () => {
        restore();
        process.exit(1);
    });
}

function runSuite() {
    return spawnSync('npx', SUITE, { stdio: 'pipe', encoding: 'utf8' }).status;
}

let failures = 0;

try {
    process.stdout.write('baseline: ');
    if (runSuite() !== 0) {
        console.error('FAIL — the injection suite is already red. Fix that first.');
        process.exit(1);
    }
    console.log('injection suite green with the real sanitiser');

    for (const weakening of WEAKENINGS) {
        const weakened = weakening.apply(original);

        if (weakened === original) {
            console.error(`FAIL — "${weakening.name}" matched nothing. `
                + 'The sanitiser changed shape; update this script.');
            failures += 1;
            continue;
        }

        writeFileSync(SANITISER, weakened);
        restored = false;

        const status = runSuite();
        restore();

        if (status === 0) {
            console.error(`FAIL — "${weakening.name}" did not fail the suite. `
                + 'The injection tests are not watching that rule.');
            failures += 1;
        } else {
            console.log(`  ok — "${weakening.name}" fails the build`);
        }
    }
} finally {
    restore();
}

if (failures > 0) {
    console.error(`\n${failures} weakening(s) went undetected. AC-F11-4 is not met.`);
    process.exit(1);
}

console.log('\nAC-F11-4: every deliberate weakening fails the build.');
