import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { setGateway } from '@/lib/ai/gateway';
import { MockGateway } from '@/lib/ai/gateway/mock';
import { generateSpike, Budget, BudgetExceeded } from './pipeline';
import type { Mode, SpikeResult } from './pipeline';
import { reportFor, indexFor } from './report';
import { blankScoresheet, passRate } from './rubric';
import type { Score } from './rubric';
import { analyse, analysisReport } from './analysis';

interface CorpusItem {
    id: string;
    vertical: string;
    hasTemplate: boolean;
    prompt: string;
}

const PACE_MS = 13_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function args(): { mode: Mode; budget: number; only: string[] } {
    const argv = process.argv.slice(2);
    const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

    return {
        mode: (get('mode') as Mode) ?? 'mock',
        budget: Number(get('budget') ?? 20),
        only: get('only')?.split(',').filter(Boolean) ?? [],
    };
}

console.log(typeof Budget);

async function main() {
    const { mode, budget: limit, only } = args();

    if (mode === 'mock') setGateway(new MockGateway());

    const corpus: CorpusItem[] = JSON.parse(
        readFileSync(join(process.cwd(), 'evals/corpus.json'), 'utf8'),
    );

    const selected = only.length ? corpus.filter((c) => only.includes(c.vertical)) : corpus;
    const budget = new Budget(mode === 'mock' ? Number.MAX_SAFE_INTEGER : limit);
    const results: SpikeResult[] = [];

    console.log(`\nmode=${mode}  verticals=${selected.length}  budget=${limit}\n`);

    for (const item of selected) {
        process.stdout.write(`  ${item.vertical.padEnd(20)}`);

        try {
            const result = await generateSpike({
                vertical: item.vertical,
                prompt: item.prompt,
                hasTemplate: item.hasTemplate,
                mode,
                budget,
            });

            results.push(result);
            console.log(
                result.ok
                    ? `ok   ${result.requests} req  ${(result.modelTimeMs / 1000).toFixed(1)}s`
                    : `FAIL ${result.error?.slice(0, 60)}`,
            );
        } catch (err) {
            if (err instanceof BudgetExceeded) {
                console.log(`stopped — ${err.message}`);
                break;
            }
            throw err;
        }

        if (mode !== 'mock') await sleep(PACE_MS);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = join(process.cwd(), 'evals/spike/results', `${stamp}-${mode}`);
    mkdirSync(dir, { recursive: true });

    for (const r of results) {
        writeFileSync(join(dir, `${r.vertical}.md`), reportFor(r));
    }

    writeFileSync(join(dir, 'index.md'), indexFor(results));
    writeFileSync(join(dir, 'raw.json'), JSON.stringify(results, null, 2));
    writeFileSync(join(dir, 'scores.json'), JSON.stringify(blankScoresheet(results), null, 2));

    if (mode !== 'mock') {
        const rpd = Number(process.env.GEMINI_RPD ?? 20);
        writeFileSync(join(dir, 'capacity.md'), analysisReport(analyse(results, rpd), rpd));
    }

    const { auto } = passRate(blankScoresheet(results));
    console.log(`\n  auto pass rate: ${(auto * 100).toFixed(0)}%`);
    console.log(`  budget left:    ${mode === 'mock' ? 'n/a' : budget.remaining}`);
    console.log(`  written to:     ${dir}\n`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});