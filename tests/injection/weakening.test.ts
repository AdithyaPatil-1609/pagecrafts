import { describe, it, expect } from 'vitest';
import { sanitise, SANITISE_RULES, type SanitiseRule } from '@/lib/ai/sanitise';
import { loadInjectionCorpus, payloadOf } from './corpus';

const corpus = loadInjectionCorpus();
const payloads = corpus.map(payloadOf);

const FORBIDDEN: RegExp[] = [
    /<\s*script\b/i,
    /<\s*\/\s*script/i,
    /<\s*iframe\b/i,
    /<\s*object\b/i,
    /<\s*embed\b/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
];

/** The assertion the injection suite makes, against an arbitrary rule set. */
function corpusIsInert(rules: ReadonlyArray<SanitiseRule>): boolean {
    return payloads.every((p) => {
        const clean = sanitise(p, rules).clean;
        return FORBIDDEN.every((f) => !f.test(clean));
    });
}

/**
 * AC-F11-4 — the check that tests the tests.
 *
 * Passing today only proves the suite passes today. It says nothing about
 * whether the suite would notice a real regression. This removes each sanitiser
 * rule in turn and asserts the corpus assertion goes red — so every rule is
 * demonstrably load-bearing, and a future tidy-up that drops one cannot land
 * quietly.
 */
describe('AC-F11-4 — a weakened sanitiser fails the suite', () => {
    it('passes with the real rule set', () => {
        expect(corpusIsInert(SANITISE_RULES)).toBe(true);
    });

    /**
     * `script` and `script-open` overlap on purpose: the first removes the whole
     * element including its body, the second catches a stray or malformed tag
     * the first cannot match. Either one alone still strips the tags, so they
     * are mutated as a pair. Their distinct behaviours are pinned separately
     * below.
     */
    const GROUPS: Array<[string, string[]]> = [
        ['script handling', ['script', 'script-open']],
        ['iframe', ['iframe']],
        ['object-embed', ['object-embed']],
        ['event-handler', ['event-handler']],
        ['javascript-url', ['javascript-url']],
    ];

    it('mutates every rule the sanitiser ships', () => {
        expect(GROUPS.flatMap(([, names]) => names).sort())
            .toEqual(SANITISE_RULES.map(([n]) => n).sort());
    });

    it.each(GROUPS)('goes red when %s is removed', (_label, names) => {
        const weakened = SANITISE_RULES.filter(([name]) => !names.includes(name));

        expect(
            corpusIsInert(weakened),
            `Removing ${names.join(' + ')} did not fail any corpus case. `
            + 'Either the rule is redundant, or nothing in the corpus exercises it — '
            + 'add a case that does rather than deleting this assertion.',
        ).toBe(false);
    });

    /** What `script` does that `script-open` does not: take the body with it. */
    it('keeps the two script rules distinct — one removes the body, one the tag', () => {
        const onlyOpen = SANITISE_RULES.filter(([n]) => n !== 'script');
        expect(sanitise('<script>alert(1)</script>', onlyOpen).clean).toBe('alert(1)');

        // The full set removes the element and everything inside it.
        expect(sanitise('<script>alert(1)</script>').clean).toBe('');
    });

    it('goes red when the sanitiser is removed entirely', () => {
        expect(corpusIsInert([])).toBe(false);
    });

    /**
     * The same argument one level up: a corpus that no longer contains active
     * content would make every mutation above pass vacuously.
     */
    it('keeps payloads that actually carry the constructs being stripped', () => {
        const carriers = payloads.filter((p) => FORBIDDEN.some((f) => f.test(p)));
        expect(carriers.length).toBeGreaterThanOrEqual(4);
    });
});
