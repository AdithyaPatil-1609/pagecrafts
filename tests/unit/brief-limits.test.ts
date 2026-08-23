import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRIEF_LIMITS, briefErrors, emptyBrief } from '@/lib/ai/generate/brief';

// Somebody pasted a 4,500-character brief -- a real one, with sections, sample classes and
// colour tokens -- into a field that takes 500. The textarea showed no limit, counted
// nothing, accepted the paste whole, and the answer came back as "Something in that was not
// accepted", naming neither the field nor the reason.
//
// The cap is fine. Everything around it was not.

const SCHEMAS = readFileSync(join(process.cwd(), 'src/lib/contracts/schemas.ts'), 'utf8');
const FIELDS = readFileSync(
    join(process.cwd(), 'src/components/discovery/BriefFields.tsx'),
    'utf8',
);

function longBrief(field: keyof typeof BRIEF_LIMITS, by: number) {
    return { ...emptyBrief(), name: 'A', offer: 'B', place: 'C', [field]: 'x'.repeat(BRIEF_LIMITS[field] + by) };
}

describe('the brief limits match the schema that enforces them', () => {
    // A form that allows more than the route accepts is a form that loses work at submit.
    it('every limit is the one createProjectSchema uses', () => {
        const brief = SCHEMAS.slice(SCHEMAS.indexOf('brief:'));

        for (const [field, limit] of Object.entries(BRIEF_LIMITS)) {
            const found = brief.match(new RegExp(`${field}:[^\\n]*?max\\((\\d+)\\)`));

            expect(found, `${field} is not capped in createProjectSchema`).toBeTruthy();
            expect(Number(found![1]), `${field} disagrees with the schema`).toBe(limit);
        }
    });
});

describe('briefErrors catches an over-long field before the request goes out', () => {
    it('says which field, how long it is, and how much to cut', () => {
        const [problem] = briefErrors(longBrief('offer', 4000));

        expect(problem).toContain('What they do');
        expect(problem).toContain('4,500');
        expect(problem).toContain('500');
        expect(problem).toMatch(/shorten it by 4,000/);
    });

    it('checks the optional fields too, not just the three required ones', () => {
        expect(briefErrors(longBrief('extra', 1))).not.toEqual([]);
        expect(briefErrors(longBrief('hours', 1))).not.toEqual([]);
        expect(briefErrors(longBrief('phone', 1))).not.toEqual([]);
    });

    it('stays quiet for a brief that fits', () => {
        const brief = { ...emptyBrief(), name: 'Savor & Stir', offer: 'Cooking classes', place: 'Bangalore' };

        expect(briefErrors(brief)).toEqual([]);
    });

    it('counts what is sent, not what was typed, so trailing space is not an error', () => {
        const brief = { ...emptyBrief(), name: 'A', place: 'C', offer: `${'x'.repeat(500)}     ` };

        expect(briefErrors(brief)).toEqual([]);
    });
});

describe('the form cannot accept more than the route will take', () => {
    it('caps every input at its limit', () => {
        for (const field of Object.keys(BRIEF_LIMITS)) {
            expect(FIELDS, `brief-${field} has no maxLength`).toContain(
                `maxLength={BRIEF_LIMITS.${field}}`,
            );
        }
    });

    it('counts the long one out loud as it fills, and says so at the cap', () => {
        expect(FIELDS).toContain('brief-offer-count');
        expect(FIELDS).toContain('aria-live="polite"');
        expect(FIELDS).toContain('Anything longer was not kept');
    });
});
