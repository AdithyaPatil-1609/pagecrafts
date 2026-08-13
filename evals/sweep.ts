import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { resetAiConfig } from '@/lib/ai/config';
import { setGateway } from '@/lib/ai/gateway';
import { setProfileStore } from '@/lib/ai/profile-cache';
import { Budget, BudgetExceeded, generateSpike, type Mode } from './spike/pipeline';
import { toOutcome } from './grader/adapt';
import { grade, summarise, type CorpusItem } from './grader/index';
import { measureDiversity, rowFor, type DiversityRow } from './grader/diversity';

loadEnv({ path: '.env.local' });

/**
 * Six verticals, not thirty. The sweep answers "which sampling setting", and
 * that question does not need the whole corpus — it needs a spread wide enough
 * that a setting cannot look good by suiting one kind of business.
 */
const SUBSET = ['v03', 'v07', 'v12', 'v19', 'v25', 'v28'];

export interface SweepConfig {
    label: string;
    temperature?: number;
    topP?: number;
}

/**
 * `provider-default` sends nothing, which is what every measurement up to D11
 * was taken under — it is the control, and without it the sweep has no baseline
 * to beat.
 */
export const GRID: SweepConfig[] = [
    { label: 'provider-default' },
    { label: 't0.2', temperature: 0.2 },
    { label: 't0.5', temperature: 0.5 },
    { label: 't0.8', temperature: 0.8 },
    { label: 't1.0', temperature: 1.0 },
    { label: 't0.7-p0.9', temperature: 0.7, topP: 0.9 },
];

export interface SweepRow {
    label: string;
    temperature?: number;
    topP?: number;
    passed: number;
    total: number;
    passRate: number;
    /** Distinct themes across the subset — the variance half of the trade. */
    distinctThemes: number;
    distinctVariantSets: number;
    dominantThemeShare: number;
    blankFields: number;
    failures: number;
    requests: number;
    tokens: number;
}

function applyConfig(cfg: SweepConfig, mode: Mode): void {
    const set = (key: string, value: number | undefined) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = String(value);
    };

    // Generation is the stage sampling actually matters for; classify is a
    // bucket choice and edit is a targeted rewrite.
    set('AI_TEMPERATURE_GENERATE', cfg.temperature);
    set('AI_TOP_P_GENERATE', cfg.topP);

    resetAiConfig();
    // The gateway is built from the config it was created with, and the profile
    // cache would otherwise serve config A's profiles to config B.
    setGateway(null);
    setProfileStore(null);
    if (mode === 'mock') process.env.LLM_MOCK = '1';
}

export async function runSweep(
    items: CorpusItem[],
    grid: SweepConfig[],
    mode: Mode,
    budget: Budget,
): Promise<SweepRow[]> {
    const rows: SweepRow[] = [];

    for (const cfg of grid) {
        applyConfig(cfg, mode);
        process.stdout.write(`\n${cfg.label}\n`);

        const grades = [];
        const diversity: DiversityRow[] = [];

        for (const item of items) {
            process.stdout.write(`  · ${item.vertical} … `);
            try {
                const result = await generateSpike({
                    vertical: item.vertical,
                    prompt: item.prompt,
                    hasTemplate: item.hasTemplate,
                    mode,
                    budget,
                    profileFrom: 'classified',
                });

                const outcome = toOutcome(result);
                const row = grade(item, outcome);
                grades.push(row);
                if (outcome.completed) diversity.push(rowFor(item.id, outcome.composition));
                console.log(row.passed ? 'pass' : 'FAIL');
            } catch (err) {
                if (err instanceof BudgetExceeded) {
                    console.log('\nBudget exhausted — stopping the sweep here.');
                    return rows;
                }
                throw err;
            }
        }

        const summary = summarise(grades);
        const d = measureDiversity(diversity);

        rows.push({
            label: cfg.label,
            temperature: cfg.temperature,
            topP: cfg.topP,
            passed: summary.overall.passed,
            total: summary.overall.total,
            passRate: summary.overall.rate,
            distinctThemes: d.themes.size,
            distinctVariantSets: d.variantSets,
            dominantThemeShare: d.dominantThemeShare,
            blankFields: grades.reduce((s, g) => s + g.blankFields.length, 0),
            failures: grades.filter((g) => !g.completed).length,
            requests: summary.totalRequests,
            tokens: summary.totalTokens,
        });
    }

    return rows;
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const get = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

    // plan-only by default. A full generation is ~9 requests per vertical, so a
    // six-config grid over six verticals is ~324 requests — far past the sweep's
    // budget. plan-only is 3 per vertical (~108 for the whole grid, and less
    // once the profile cache is warm), and sampling shows up in the plan.
    const mode: Mode = argv.includes('--mock')
        ? 'mock'
        : (get('mode') as Mode) ?? 'plan-only';

    const all: CorpusItem[] = JSON.parse(
        readFileSync(join(process.cwd(), 'evals/corpus-30.json'), 'utf8'),
    );
    const ids = (get('only') ?? SUBSET.join(',')).split(',');
    const items = all.filter((i) => ids.includes(i.id));

    const budget = new Budget(Number(get('budget') ?? 150));

    console.log(`sweeping ${GRID.length} configs × ${items.length} verticals · mode ${mode}`);

    const rows = await runSweep(items, GRID, mode, budget);

    console.table(rows.map((r) => ({
        config: r.label,
        pass: `${r.passed}/${r.total}`,
        themes: r.distinctThemes,
        variantSets: r.distinctVariantSets,
        blanks: r.blankFields,
        failures: r.failures,
        reqs: r.requests,
    })));

    console.log(
        '\nLower temperature buys reliability and costs distinctiveness.\n'
        + 'Which one you want depends on which D11 said was the problem — read the\n'
        + 'baseline before reading this table.\n',
    );

    const dir = join(process.cwd(), 'evals/grader/results');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `sweep-${new Date().toISOString().replace(/[:.]/g, '-')}-${mode}.json`);
    writeFileSync(file, JSON.stringify({ mode, subset: ids, rows }, null, 2));
    console.log(`saved -> ${file}\n`);
}

if (process.argv[1]?.endsWith('sweep.ts')) {
    main().catch((err) => {
        console.error(err instanceof Error ? err.stack ?? err.message : err);
        process.exit(1);
    });
}
