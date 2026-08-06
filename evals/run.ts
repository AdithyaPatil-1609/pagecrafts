import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runPrompt } from '../src/lib/ai/harness/runner';
import { SECTION_KEYS } from '../src/lib/contracts';
import type { Category } from '../src/lib/contracts';
import { CATEGORY_LIST, categorySchema } from '../src/lib/ai/schemas';
import { config } from 'dotenv';
config({ path: '.env.local' });

interface CorpusItem {
    id: string;
    vertical: string;
    expectedCategory: Category;
    hasTemplate: boolean;
    prompt: string;
}

interface EvalRow {
    id: string;
    vertical: string;
    expectedCategory: Category;
    hasTemplate: boolean;
    prompt: string;
    ok: boolean;
    latencyMs: number;
    pass: boolean | null;
    actualCategory?: string;
    templateId?: string;
    templateVersion?: string;
    model?: string;
    output?: string;
    inputTokens?: number;
    outputTokens?: number;
    ranAt?: string;
    error?: string;
}

const RESULTS_DIR = join(process.cwd(), 'evals/results');
const PACE_MS = 13_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function categoryOf(output: string): string | undefined {
    const match = output.match(/"category"\s*:\s*"([^"]+)"/);
    if (!match) return undefined;
    const parsed = categorySchema.safeParse(match[1]);
    return parsed.success ? parsed.data : match[1];
}

async function main() {
    const corpus: CorpusItem[] = JSON.parse(
        readFileSync(join(process.cwd(), 'evals/corpus.json'), 'utf8'),
    );

    const rows: EvalRow[] = [];

    for (const item of corpus) {
        const startedAt = Date.now();
        try {
            const run = await runPrompt({
                template: 'classify.v1',
                vars: {
                    text: item.prompt,
                    categories: CATEGORY_LIST,
                    tones: 'playful, formal, minimal, bold, warm',
                    palettes: 'light, dark, colourful, muted',
                    sectionKeys: SECTION_KEYS.join(', '),
                },
            });

            const actualCategory = categoryOf(run.output);
            rows.push({
                ...item,
                ok: true,
                ...run,
                actualCategory,
                pass: actualCategory === undefined ? null : actualCategory === item.expectedCategory,
            });
        } catch (err) {
            rows.push({
                ...item,
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                latencyMs: Date.now() - startedAt,
                pass: null,
            });
        }

        await sleep(PACE_MS);
    }

    mkdirSync(RESULTS_DIR, { recursive: true });
    const file = join(RESULTS_DIR, `results-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify(rows, null, 2));

    const ok = rows.filter((r) => r.ok);
    const graded = rows.filter((r) => r.pass !== null);
    const passed = graded.filter((r) => r.pass);
    const totalIn = ok.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
    const totalOut = ok.reduce((s, r) => s + (r.outputTokens ?? 0), 0);
    const meanMs = ok.length ? Math.round(ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length) : 0;

    console.table(
        rows.map((r) => ({
            id: r.id,
            vertical: r.vertical,
            template: r.hasTemplate ? 'yes' : 'NO',
            expected: r.expectedCategory,
            actual: r.actualCategory ?? '-',
            pass: r.pass === null ? '?' : r.pass ? 'yes' : 'NO',
            ms: r.latencyMs,
            tokens: r.ok ? `${r.inputTokens}/${r.outputTokens}` : '-',
        })),
    );

    console.log(`\n${ok.length}/${rows.length} completed · mean ${meanMs}ms`);
    console.log(
        `category ${passed.length}/${graded.length} correct (${rows.length - graded.length} ungraded)`,
    );
    console.log(`tokens ${totalIn} in / ${totalOut} out · requests used: ${rows.length}`);
    console.log(`saved -> ${file}\n`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});