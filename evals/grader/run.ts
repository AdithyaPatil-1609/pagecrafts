import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import {
    Budget, BudgetExceeded, generateSpike, type Mode, type SpikeResult,
} from '../spike/pipeline';
import { toOutcome } from './adapt';
import {
    grade, summarise, blankHumanSheet, summariseHuman,
    type AutoGrade, type CorpusItem, type HumanGrade,
} from './index';
import { measureDiversity, rowFor, type DiversityRow } from './diversity';
import { diversityStore, resetDiversityStore } from '@/lib/ai/composition/diversity';
import type { MotionId, ThemeId } from '@/lib/contracts';
import { clusterFailures, failuresByStage, topThree, type GradedRun } from './taxonomy';

config({ path: '.env.local' });

const CORPUS = join(process.cwd(), 'evals/corpus-30.json');
const RESULTS = join(process.cwd(), 'evals/grader/results');

interface Args {
    mode: Mode;
    budget: number;
    only: string[];
    humanSheet?: string;
    label: string;
    /** An existing results directory to continue into, skipping what it already holds. */
    resume?: string;
    /** `interleaved` (default) round-robins the groups so a partial run samples all of them. */
    order: 'interleaved' | 'file';
}

function parseArgs(argv: string[]): Args {
    const get = (name: string): string | undefined =>
        argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

    const only = get('only');
    return {
        mode: argv.includes('--mock') ? 'mock' : (get('mode') as Mode) ?? 'full',
        // A hard ceiling on provider calls. The run stops rather than quietly
        // spending a day's quota because the corpus grew.
        budget: Number(get('budget') ?? 400),
        only: only ? only.split(',').map((s) => s.trim()).filter(Boolean) : [],
        humanSheet: get('human'),
        label: get('label') ?? 'baseline',
        resume: get('resume'),
        order: get('order') === 'file' ? 'file' : 'interleaved',
    };
}

/**
 * Round-robin across the corpus groups.
 *
 * The corpus is written no-template first, so a run that stops on quota — which
 * on the free tier is every run — samples only the head of the file. The first
 * real baseline completed nine verticals and every one of them was no-template:
 * the control group never executed, so the comparison the whole corpus is built
 * around could not be made. Interleaving means a partial run is still a
 * proportionate sample of all four groups.
 */
export function interleaveByGroup(items: CorpusItem[]): CorpusItem[] {
    const queues = new Map<string, CorpusItem[]>();
    for (const item of items) {
        const q = queues.get(item.group) ?? [];
        q.push(item);
        queues.set(item.group, q);
    }

    // Largest group first, so its extras spread across the tail rather than
    // bunching at the end.
    const lanes = [...queues.values()].sort((a, b) => b.length - a.length);
    const out: CorpusItem[] = [];

    for (let i = 0; out.length < items.length; i += 1) {
        for (const lane of lanes) {
            if (i < lane.length) out.push(lane[i]);
        }
    }

    return out;
}

function loadHumanSheet(path: string | undefined, items: CorpusItem[]): HumanGrade[] {
    if (!path) return blankHumanSheet(items);
    const rows: HumanGrade[] = JSON.parse(readFileSync(path, 'utf8'));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return blankHumanSheet(items).map((blank) => byId.get(blank.id) ?? blank);
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));

    if (args.mode === 'mock') process.env.LLM_MOCK = '1';

    const all: CorpusItem[] = JSON.parse(readFileSync(CORPUS, 'utf8'));
    let items = args.only.length
        ? all.filter((i) => args.only.includes(i.id) || args.only.includes(i.vertical))
        : all;

    if (items.length === 0) {
        throw new Error(`--only matched nothing. Known ids: ${all.map((i) => i.id).join(', ')}`);
    }

    if (args.order === 'interleaved') items = interleaveByGroup(items);

    const budget = new Budget(args.budget);
    const human = loadHumanSheet(args.humanSheet, items);
    const humanById = new Map(human.map((h) => [h.id, h]));

    const grades: AutoGrade[] = [];
    const runs: GradedRun[] = [];
    const diversityRows: DiversityRow[] = [];
    const raw: unknown[] = [];

    // ── the run directory, opened before the first request ─────────────────
    // A 30-vertical run costs an hour of wall clock and real quota. Writing
    // only at the end means a kill, a timeout or a laptop lid loses every
    // vertical already paid for — which is exactly what happened on the first
    // attempt. Each vertical is flushed to disk as it completes.
    const dir = args.resume ?? join(
        RESULTS,
        `${new Date().toISOString().replace(/[:.]/g, '-')}-${args.label}-${args.mode}`,
    );
    mkdirSync(dir, { recursive: true });

    const partialPath = join(dir, 'grades.json');
    const rawPath = join(dir, 'raw.json');

    if (args.resume) {
        const done = new Set<string>();
        try {
            const prior: AutoGrade[] = JSON.parse(readFileSync(partialPath, 'utf8'));
            const priorRaw: SpikeResult[] = JSON.parse(readFileSync(rawPath, 'utf8'));

            for (const [i, g] of prior.entries()) {
                const item = all.find((x) => x.id === g.id);
                const result = priorRaw[i];
                if (!item || !result) continue;

                done.add(g.id);
                grades.push(g);
                raw.push(result);

                const outcome = toOutcome(result);
                runs.push({ grade: g, outcome, human: humanById.get(g.id) });
                if (outcome.completed) diversityRows.push(rowFor(g.id, outcome.composition));
            }
        } catch {
            console.log('No resumable grades found in that directory — starting fresh.');
        }

        items = items.filter((i) => !done.has(i.id));
        console.log(`Resuming ${dir}: ${done.size} already graded, ${items.length} to go.\n`);
    }

    resetDiversityStore();
    for (const row of diversityRows) {
        diversityStore().record({
            themeId: row.themeId as ThemeId,
            motionId: row.motionId as MotionId,
        });
    }

    const flush = () => {
        writeFileSync(partialPath, JSON.stringify(grades, null, 2));
        writeFileSync(rawPath, JSON.stringify(raw, null, 2));
    };

    for (const item of items) {
        process.stdout.write(`· ${item.id} ${item.vertical} … `);

        let result;
        try {
            result = await generateSpike({
                vertical: item.vertical,
                prompt: item.prompt,
                hasTemplate: item.hasTemplate,
                mode: args.mode,
                budget,
                // The classify → profile handoff is part of what D11 tests.
                profileFrom: 'classified',
            });
        } catch (err) {
            if (err instanceof BudgetExceeded) {
                console.log('\n\nBudget exhausted — stopping here.');
                console.log(`Graded ${grades.length}/${items.length}. Raise --budget to continue.\n`);
                break;
            }
            throw err;
        }

        const outcome = toOutcome(result);
        const row = grade(item, outcome);

        grades.push(row);
        runs.push({ grade: row, outcome, human: humanById.get(item.id) });
        raw.push(result);
        if (outcome.completed) diversityRows.push(rowFor(item.id, outcome.composition));

        // Paid for, therefore persisted — before anything else can go wrong.
        flush();

        console.log(
            row.passed
                ? 'pass'
                : `FAIL (${row.completed ? 'completed but below bar' : row.failureStage})`,
        );
    }

    const summary = summarise(grades);
    const diversity = measureDiversity(diversityRows);
    const clusters = clusterFailures(runs);
    const humanSummary = summariseHuman(human.filter((h) => grades.some((g) => g.id === h.id)));

    // ── report ─────────────────────────────────────────────────────────────
    console.table(grades.map((g) => ({
        id: g.id,
        vertical: g.vertical,
        template: g.hasTemplate ? 'yes' : 'NO',
        pass: g.passed ? 'yes' : 'NO',
        stage: g.failureStage ?? '-',
        sections: g.sectionCount,
        blanks: g.blankFields.length,
        cat: g.categoryCorrect ? 'ok' : 'NO',
        reqs: g.requests,
    })));

    const pct = (r: { passed: number; total: number; rate: number }) =>
        `${r.passed}/${r.total} (${(r.rate * 100).toFixed(0)}%)`;

    console.log(`\noverall      ${pct(summary.overall)}`);
    console.log(`no template  ${pct(summary.noTemplate)}   ← the claim under test`);
    console.log(`template     ${pct(summary.withTemplate)}   ← control group`);
    console.log(`completed but below the bar: ${summary.completedButFailed}`);
    console.log(`category correct: ${summary.categoryCorrect}/${grades.length}`);

    console.log(`\ndiversity — ${diversity.passes ? 'PASSES' : 'FAILS'}`);
    console.log(`  dominant theme  ${diversity.dominantTheme} `
        + `${(diversity.dominantThemeShare * 100).toFixed(0)}%`);
    console.log(`  dominant motion ${diversity.dominantMotion} `
        + `${(diversity.dominantMotionShare * 100).toFixed(0)}%`);
    console.log(`  distinct variant sets ${diversity.variantSets}/${diversityRows.length}`);
    for (const note of diversity.notes) console.log(`  ! ${note}`);

    if (clusters.length) {
        console.log('\nfailure clusters, ranked by count × impact:');
        console.table(clusters.map((c) => ({
            stage: c.stage,
            symptom: c.symptom,
            count: c.count,
            score: c.score,
            verticals: c.verticals.slice(0, 5).join(', '),
        })));
        console.log('\nD12 fixes these three and nothing else:');
        for (const [i, c] of topThree(clusters).entries()) {
            console.log(`  ${i + 1}. ${c.stage}/${c.symptom} — ${c.count} verticals`);
        }
    }

    if (!humanSummary.complete) {
        console.log(`\nhuman columns unread: ${JSON.stringify(humanSummary.unread)}`);
        console.log('  (means stay null until a column is fully read — a default is not a score)');
    }

    console.log(`\nspend: ${summary.totalRequests} requests · ${summary.totalTokens} tokens`);

    // Same directory the per-vertical flush has been writing into all along.
    const write = (name: string, data: unknown) =>
        writeFileSync(join(dir, name), JSON.stringify(data, null, 2));

    write('grades.json', grades);
    write('summary.json', {
        summary,
        diversity: {
            ...diversity,
            themes: Object.fromEntries(diversity.themes),
            motions: Object.fromEntries(diversity.motions),
        },
        clusters,
        stages: failuresByStage(runs),
        human: humanSummary,
        mode: args.mode,
        ranAt: new Date().toISOString(),
    });
    write('raw.json', raw);
    // A blank sheet to fill in by hand, unless one was supplied.
    if (!args.humanSheet) write('human-sheet.json', human);

    console.log(`saved -> ${dir}\n`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : err);
    process.exit(1);
});
