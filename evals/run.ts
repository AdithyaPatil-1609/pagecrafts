import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runPrompt } from '../src/lib/ai/harness/runner';
import { SECTION_KEYS } from '../src/lib/contracts';
import { config } from 'dotenv';
config({ path: '.env.local' });
interface CorpusItem {
    id: string;
    vertical: string;
    hasTemplate: boolean;
    prompt: string;
}

interface EvalRow {
    id: string;
    vertical: string;
    hasTemplate: boolean;
    prompt: string;
    ok: boolean;
    latencyMs: number;
    pass: boolean | null;
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
                    categories: 'restaurant, portfolio, saas, event, personal, shop, blog, other',
                    tones: 'playful, formal, minimal, bold, warm',
                    palettes: 'light, dark, colourful, muted',
                    sectionKeys: SECTION_KEYS.join(', '),
                },
            });
            rows.push({ ...item, ok: true, ...run, pass: null });
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
    const totalIn = ok.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
    const totalOut = ok.reduce((s, r) => s + (r.outputTokens ?? 0), 0);
    const meanMs = ok.length ? Math.round(ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length) : 0;

    console.table(
    rows.map((r) => ({
        id: r.id,
        vertical: r.vertical,
        template: r.hasTemplate ? 'yes' : 'NO',
        ok: r.ok,
        ms: r.latencyMs,
        tokens: r.ok ? `${r.inputTokens}/${r.outputTokens}` : '-',
    })),
);

    console.log(`\n${ok.length}/${rows.length} completed · mean ${meanMs}ms`);
    console.log(`tokens ${totalIn} in / ${totalOut} out · requests used: ${rows.length}`);
    console.log(`saved -> ${file}\n`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});