import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    buildDashboard, reconcile, renderDashboard, renderReconciliation,
    type GenerationRow,
} from '@/lib/ai/cost/dashboard';
import type { LedgerRow } from '@/lib/ai/cost/ledger';
import type { SpikeResult } from '../evals/spike/pipeline';

/**
 * D17 — the cost dashboard.
 *
 * Reads priced calls from wherever they are. Today that is the eval runs on
 * disk, because the `generations` table is not yet carrying rows; the shape it
 * builds is the same either way, so pointing it at the table later is a change
 * of source, not of dashboard.
 *
 *   npm run cost -- evals/grader/results/<run>
 *   npm run cost -- <run> --invoice=groq:120,gemini:0
 */

function rowsFromRun(dir: string): GenerationRow[] {
    const rawPath = join(dir, 'raw.json');
    if (!existsSync(rawPath)) return [];

    const results: SpikeResult[] = JSON.parse(readFileSync(rawPath, 'utf8'));

    return results.flatMap((result) =>
        (result.ledger ?? []).map((r: LedgerRow): GenerationRow => ({
            // An eval run has no user, and saying so keeps it out of the
            // cost-per-user figure rather than depressing it.
            userId: null,
            provider: r.provider,
            model: r.model,
            stage: r.stage,
            promptVersion: r.promptVersion,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            costCents: r.costCents,
            status: r.status,
            latencyMs: r.latencyMs,
            createdAt: r.createdAt,
        })));
}

function parseInvoice(arg: string | undefined): Record<string, number> {
    if (!arg) return {};
    return Object.fromEntries(
        arg.split(',').map((pair) => {
            const [provider, cents] = pair.split(':');
            return [provider.trim(), Number(cents)];
        }),
    );
}

function main(): void {
    const argv = process.argv.slice(2);
    const flags = argv.filter((a) => a.startsWith('--'));
    const paths = argv.filter((a) => !a.startsWith('--'));
    const get = (n: string) => flags.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

    const RESULTS = join(process.cwd(), 'evals/grader/results');

    // No path given: every run on disk, which is the closest thing to a
    // programme-to-date total until the table is live.
    const dirs = paths.length
        ? paths
        : (existsSync(RESULTS)
            ? readdirSync(RESULTS)
                .map((d) => join(RESULTS, d))
                .filter((d) => existsSync(join(d, 'raw.json')))
            : []);

    if (dirs.length === 0) {
        console.error('No priced calls found. Run `npm run grade` first, or pass a results directory.');
        process.exit(2);
    }

    const rows = dirs.flatMap(rowsFromRun);

    if (rows.length === 0) {
        console.error(`No ledger rows in: ${dirs.join(', ')}`);
        console.error('A mock run prices nothing — the rate card is zero for a mock provider.');
        process.exit(2);
    }

    const dashboard = buildDashboard(rows);
    const markdown = renderDashboard(dashboard);

    console.log(markdown);
    console.log(`\n_Sources: ${dirs.length} run(s)._`);

    const invoice = parseInvoice(get('invoice'));
    let reconciliation = '';
    if (Object.keys(invoice).length) {
        const rec = reconcile(dashboard, invoice);
        reconciliation = `\n\n## Invoice reconciliation (NFR-142)\n\n${renderReconciliation(rec)}`;
        console.log(reconciliation);

        if (rec.some((r) => !r.withinTolerance)) {
            console.error('\nA provider is outside tolerance — see INVESTIGATE above.');
        }
    }

    const out = get('out');
    if (out) {
        writeFileSync(out, `${markdown}\n\n_Sources: ${dirs.length} run(s)._${reconciliation}\n`);
        console.log(`\nsaved -> ${out}`);
    }
}

main();
