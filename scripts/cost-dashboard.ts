import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
    buildDashboard, reconcile, renderDashboard, renderReconciliation,
    type GenerationRow,
} from '@/lib/ai/cost/dashboard';
import type { LedgerRow } from '@/lib/ai/cost/ledger';
import type { SpikeResult } from '../evals/spike/pipeline';

/**
 * D17 — the cost dashboard.
 *
 * Reads production rows by default. Explicit result directories keep eval
 * spend available for quality work without mixing it into cost-per-user.
 *
 *   npm run cost
 *   npm run cost -- evals/grader/results/<run>
 *   npm run cost -- <run> --invoice=groq:120,gemini:0
 */

function rowsFromRun(dir: string): GenerationRow[] {
    const rawPath = join(dir, 'raw.json');
    if (!existsSync(rawPath)) return [];

    const results: SpikeResult[] = JSON.parse(readFileSync(rawPath, 'utf8'));

    return results.flatMap((result) =>
        (result.ledger ?? []).map((r: LedgerRow): GenerationRow => ({
            generationId: undefined,
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

interface DatabaseRow {
    job_id: string | null;
    user_id: string | null;
    provider: GenerationRow['provider'];
    model: string;
    stage: string | null;
    prompt_version: string | null;
    input_tokens: number;
    output_tokens: number;
    cost_cents: number | string;
    status: GenerationRow['status'];
    latency_ms: number;
    created_at: string;
}

async function rowsFromDatabase(): Promise<GenerationRow[]> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error(
            'Cost dashboard needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, '
            + 'or an eval results directory.',
        );
    }

    const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const rows: DatabaseRow[] = [];
    const pageSize = 1_000;

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await client
            .from('generations')
            .select(
                'job_id,user_id,provider,model,stage,prompt_version,input_tokens,'
                + 'output_tokens,cost_cents,status,latency_ms,created_at',
            )
            .order('created_at', { ascending: true })
            .range(from, from + pageSize - 1);

        if (error) throw new Error(`Could not read generations: ${error.message}`);
        const page = (data ?? []) as unknown as DatabaseRow[];
        rows.push(...page);
        if (page.length < pageSize) break;
    }

    return rows.map((row) => ({
        generationId: row.job_id ?? undefined,
        userId: row.user_id,
        provider: row.provider ?? 'unknown',
        model: row.model,
        stage: row.stage ?? undefined,
        promptVersion: row.prompt_version ?? undefined,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        costCents: Number(row.cost_cents),
        status: row.status,
        latencyMs: row.latency_ms,
        createdAt: row.created_at,
    }));
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

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const flags = argv.filter((a) => a.startsWith('--'));
    const paths = argv.filter((a) => !a.startsWith('--'));
    const get = (n: string) => flags.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

    const RESULTS = join(process.cwd(), 'evals/grader/results');

    const useEval = flags.includes('--eval') || paths.length > 0;
    const dirs = paths.length
        ? paths
        : (useEval && existsSync(RESULTS)
            ? readdirSync(RESULTS)
                .map((d) => join(RESULTS, d))
                .filter((d) => existsSync(join(d, 'raw.json')))
            : []);

    if (useEval && dirs.length === 0) {
        console.error('No priced calls found. Run `npm run grade` first, or pass a results directory.');
        process.exit(2);
    }

    const rows = useEval ? dirs.flatMap(rowsFromRun) : await rowsFromDatabase();

    if (rows.length === 0) {
        console.error(useEval ? `No ledger rows in: ${dirs.join(', ')}` : 'No production ledger rows.');
        process.exit(2);
    }

    const dashboard = buildDashboard(rows);
    const markdown = renderDashboard(dashboard);

    console.log(markdown);
    const source = useEval ? `${dirs.length} eval run(s)` : 'public.generations';
    console.log(`\n_Source: ${source}._`);

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
        writeFileSync(out, `${markdown}\n\n_Source: ${source}._${reconciliation}\n`);
        console.log(`\nsaved -> ${out}`);
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
