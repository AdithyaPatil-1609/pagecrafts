import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AutoGrade, HumanGrade } from './grader/index';

export type Delta = 'improved' | 'unchanged' | 'REGRESSED';

export interface Comparison {
    vertical: string;
    id: string;
    hasTemplate: boolean;
    before: { passed: boolean; copy: number | null };
    after: { passed: boolean; copy: number | null };
    /**
     * `REGRESSED` is capitalised because it is a blocking outcome, not a
     * shouting convention. The acceptance criterion is *pass rate up, zero
     * regressions* — a tuning pass that raises the average while breaking three
     * previously-working verticals is a bad trade, and an average will not show
     * it to you.
     */
    delta: Delta;
    /** What changed, for the write-up: which check flipped. */
    reason: string;
}

export interface ComparisonReport {
    rows: Comparison[];
    improved: number;
    unchanged: number;
    regressed: number;
    beforeRate: number;
    afterRate: number;
    /** Only true when the rate rose AND nothing regressed. */
    acceptable: boolean;
    /** Verticals present in one run and not the other — compared against nothing. */
    unmatched: string[];
}

const copyOf = (sheet: Map<string, HumanGrade>, id: string): number | null =>
    sheet.get(id)?.copySensible ?? null;

/** Which objective check flipped, so a regression names itself. */
function reasonFor(before: AutoGrade, after: AutoGrade): string {
    const checks: Array<[string, boolean, boolean]> = [
        ['completed', before.completed, after.completed],
        ['non-blank', before.nonBlank, after.nonBlank],
        ['required sections', before.requiredSectionsPresent, after.requiredSectionsPresent],
        ['forbidden sections absent', before.forbiddenSectionsAbsent, after.forbiddenSectionsAbsent],
        ['no fallback', !before.fallbackUsed, !after.fallbackUsed],
    ];

    const flipped = checks
        .filter(([, b, a]) => b !== a)
        .map(([name, b]) => `${name} ${b ? 'lost' : 'gained'}`);

    if (flipped.length === 0) {
        if (after.failureStage && after.failureStage !== before.failureStage) {
            return `still failing, now at ${after.failureStage}`;
        }
        return 'no change in objective checks';
    }

    return flipped.join('; ');
}

export function compare(
    before: AutoGrade[],
    after: AutoGrade[],
    humanBefore: HumanGrade[] = [],
    humanAfter: HumanGrade[] = [],
): ComparisonReport {
    const beforeById = new Map(before.map((r) => [r.id, r]));
    const afterById = new Map(after.map((r) => [r.id, r]));
    const hb = new Map(humanBefore.map((r) => [r.id, r]));
    const ha = new Map(humanAfter.map((r) => [r.id, r]));

    const rows: Comparison[] = [];

    for (const [id, b] of beforeById) {
        const a = afterById.get(id);
        if (!a) continue;

        const delta: Delta = b.passed === a.passed
            ? 'unchanged'
            : a.passed ? 'improved' : 'REGRESSED';

        rows.push({
            id,
            vertical: a.vertical,
            hasTemplate: a.hasTemplate,
            before: { passed: b.passed, copy: copyOf(hb, id) },
            after: { passed: a.passed, copy: copyOf(ha, id) },
            delta,
            reason: reasonFor(b, a),
        });
    }

    // A vertical that appears in only one run has not been compared. Silently
    // dropping it is how a regression hides.
    const unmatched = [
        ...[...beforeById.keys()].filter((id) => !afterById.has(id)),
        ...[...afterById.keys()].filter((id) => !beforeById.has(id)),
    ];

    const regressed = rows.filter((r) => r.delta === 'REGRESSED').length;
    const beforeRate = before.length ? before.filter((r) => r.passed).length / before.length : 0;
    const afterRate = after.length ? after.filter((r) => r.passed).length / after.length : 0;

    return {
        rows: rows.sort((x, y) =>
            (x.delta === 'REGRESSED' ? -1 : 0) - (y.delta === 'REGRESSED' ? -1 : 0)
            || x.id.localeCompare(y.id)),
        improved: rows.filter((r) => r.delta === 'improved').length,
        unchanged: rows.filter((r) => r.delta === 'unchanged').length,
        regressed,
        beforeRate,
        afterRate,
        acceptable: afterRate > beforeRate && regressed === 0 && unmatched.length === 0,
        unmatched,
    };
}

/** The before/after table D12 publishes. */
export function markdownTable(report: ComparisonReport): string {
    const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
    const mark = (r: Comparison) =>
        r.delta === 'REGRESSED' ? '**REGRESSED**' : r.delta;
    const cell = (p: boolean, copy: number | null) =>
        `${p ? 'pass' : 'fail'}${copy === null ? '' : ` · ${copy}/5`}`;

    const lines = [
        `Pass rate ${pct(report.beforeRate)} → ${pct(report.afterRate)} · `
        + `${report.improved} improved · ${report.regressed} regressed`,
        '',
        '| Vertical | Template | Before | After | Delta | What changed |',
        '|---|---|---|---|---|---|',
        ...report.rows.map((r) =>
            `| ${r.vertical} | ${r.hasTemplate ? 'yes' : 'no'} `
            + `| ${cell(r.before.passed, r.before.copy)} `
            + `| ${cell(r.after.passed, r.after.copy)} `
            + `| ${mark(r)} | ${r.reason} |`),
    ];

    if (report.unmatched.length) {
        lines.push('', `Not compared (present in only one run): ${report.unmatched.join(', ')}`);
    }

    lines.push('', report.acceptable
        ? 'Acceptable: pass rate up, zero regressions.'
        : 'NOT acceptable: '
        + [
            report.afterRate <= report.beforeRate && 'pass rate did not rise',
            report.regressed > 0 && `${report.regressed} vertical(s) regressed`,
            report.unmatched.length > 0 && `${report.unmatched.length} vertical(s) uncompared`,
        ].filter(Boolean).join('; ')
        + '.');

    return lines.join('\n');
}

// ── CLI ────────────────────────────────────────────────────────────────────

function loadRun(dir: string): { grades: AutoGrade[]; human: HumanGrade[] } {
    const read = <T>(name: string, fallback: T): T => {
        try {
            return JSON.parse(readFileSync(join(dir, name), 'utf8')) as T;
        } catch {
            return fallback;
        }
    };
    return {
        grades: read<AutoGrade[]>('grades.json', []),
        human: read<HumanGrade[]>('human-sheet.json', []),
    };
}

if (process.argv[1]?.endsWith('compare.ts')) {
    const [beforeDir, afterDir] = process.argv.slice(2);

    if (!beforeDir || !afterDir) {
        console.error('usage: npm run compare -- <before-results-dir> <after-results-dir>');
        process.exit(2);
    }

    const b = loadRun(beforeDir);
    const a = loadRun(afterDir);

    if (b.grades.length === 0 || a.grades.length === 0) {
        console.error('One of the runs has no grades.json — check the paths.');
        process.exit(2);
    }

    const report = compare(b.grades, a.grades, b.human, a.human);
    console.log(markdownTable(report));

    // A regression fails the command, so it cannot be skimmed past.
    process.exit(report.acceptable ? 0 : 1);
}
