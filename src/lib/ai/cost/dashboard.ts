import type { Provider } from '../config';
import type { GenerationStatus } from './ledger';

/**
 * D17 — the cost dashboard, and D20's "cost-per-user is a known number".
 *
 * The ledger prices one generation. This aggregates many, which is a different
 * question: not "what did that cost" but "what are we spending, on what, and
 * can we reconcile it against the invoice" (NFR-142).
 *
 * Everything here is a pure function over rows so it can be tested without a
 * database and run against either the `generations` table or an eval run.
 */

/** One priced model call, as `public.generations` stores it. */
export interface GenerationRow {
    generationId?: string;
    userId: string | null;
    provider: Provider | 'unknown';
    model: string;
    stage?: string;
    promptVersion?: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    status: GenerationStatus;
    latencyMs: number;
    createdAt: string;
}

export interface Slice {
    calls: number;
    tokens: number;
    costCents: number;
    failed: number;
}

const EMPTY = (): Slice => ({ calls: 0, tokens: 0, costCents: 0, failed: 0 });

const round = (n: number) => Number(n.toFixed(4));

function add(slice: Slice, row: GenerationRow): Slice {
    return {
        calls: slice.calls + 1,
        tokens: slice.tokens + row.inputTokens + row.outputTokens,
        costCents: round(slice.costCents + row.costCents),
        failed: slice.failed + (row.status === 'completed' ? 0 : 1),
    };
}

function groupBy(rows: GenerationRow[], key: (r: GenerationRow) => string): Record<string, Slice> {
    const out: Record<string, Slice> = {};
    for (const row of rows) {
        const k = key(row);
        out[k] = add(out[k] ?? EMPTY(), row);
    }
    return out;
}

export interface CostDashboard {
    total: Slice;
    /** For reconciling against each provider's invoice separately (NFR-142). */
    byProvider: Record<string, Slice>;
    /** Where the money goes inside a generation — classify, profile, plan, fill. */
    byStage: Record<string, Slice>;
    byModel: Record<string, Slice>;
    /** UTC days, for the trend line. */
    byDay: Record<string, Slice>;
    /** Which prompt version produced the spend, so a tuning change is attributable. */
    byPromptVersion: Record<string, Slice>;

    users: number;
    /** Anonymous/system rows — eval runs have no user and must not skew per-user cost. */
    unattributedCalls: number;

    costPerUserCents: number | null;
    costPerGenerationCents: number | null;
    /** Distinct generations, inferred from user+day when no generation id is stored. */
    generations: number;

    failureRate: number;
    /** Spend on calls that produced nothing. The number worth driving to zero. */
    wastedCents: number;

    /**
     * Providers that burned tokens and were priced at nothing.
     *
     * On a free tier that is the truth. After billing is enabled it means the
     * rate card in config was never filled in, and the dashboard will keep
     * reporting a confident ₹0.00 — which would make D20's "cost-per-user is a
     * known number" false while looking finished. Unpriced is not the same as
     * free, and the two must not render identically.
     */
    unpricedProviders: string[];
}

/**
 * A generation is several calls. Without a generation id on the row, the best
 * available grouping is user + minute: the pipeline's calls for one request all
 * land within a minute of each other, and two requests from one user inside the
 * same minute is rare enough not to distort a spend figure.
 */
function generationKey(row: GenerationRow): string {
    return row.generationId ?? `${row.userId ?? 'anon'}:${row.createdAt.slice(0, 16)}`;
}

export function buildDashboard(rows: GenerationRow[]): CostDashboard {
    const total = rows.reduce(add, EMPTY());

    const users = new Set(rows.map((r) => r.userId).filter((id): id is string => Boolean(id)));
    const generations = new Set(rows.map(generationKey));

    // Per-user cost counts only spend that belongs to a user. Eval runs and
    // system jobs are real money but they are not a user's cost, and folding
    // them in makes the launch-day number look worse than the product is.
    const attributed = rows.filter((r) => r.userId);
    const attributedCost = round(attributed.reduce((s, r) => s + r.costCents, 0));

    const wastedCents = round(
        rows.filter((r) => r.status !== 'completed').reduce((s, r) => s + r.costCents, 0),
    );

    const byProvider = groupBy(rows, (r) => r.provider);
    const unpricedProviders = Object.entries(byProvider)
        .filter(([, s]) => s.tokens > 0 && s.costCents === 0)
        .map(([provider]) => provider)
        .sort();

    return {
        total,
        byProvider,
        byStage: groupBy(rows, (r) => r.stage ?? 'unknown'),
        byModel: groupBy(rows, (r) => r.model),
        byDay: groupBy(rows, (r) => r.createdAt.slice(0, 10)),
        byPromptVersion: groupBy(rows, (r) => r.promptVersion ?? 'unversioned'),

        users: users.size,
        unattributedCalls: rows.length - attributed.length,

        costPerUserCents: users.size ? round(attributedCost / users.size) : null,
        costPerGenerationCents: generations.size
            ? round(total.costCents / generations.size)
            : null,
        generations: generations.size,

        failureRate: rows.length ? total.failed / rows.length : 0,
        wastedCents,
        unpricedProviders,
    };
}

// ── reconciliation (NFR-142) ───────────────────────────────────────────────

export interface Reconciliation {
    provider: string;
    ourCents: number;
    invoiceCents: number;
    varianceCents: number;
    /** Signed share of the invoice we failed to account for. */
    variancePct: number;
    withinTolerance: boolean;
}

/**
 * Our ledger against the provider's invoice.
 *
 * A tolerance exists because the two are counted differently — providers round
 * per request, bill in their own currency, and may not charge for a call that
 * failed after dispatch. A few percent is normal; a large gap means either the
 * rate card in config is stale or calls are happening that the ledger never saw,
 * and the second is the one worth finding.
 */
export const RECONCILE_TOLERANCE_PCT = 5;

export function reconcile(
    dashboard: CostDashboard,
    invoiceCentsByProvider: Record<string, number>,
): Reconciliation[] {
    const providers = new Set([
        ...Object.keys(dashboard.byProvider),
        ...Object.keys(invoiceCentsByProvider),
    ]);

    return [...providers].sort().map((provider) => {
        const ourCents = round(dashboard.byProvider[provider]?.costCents ?? 0);
        const invoiceCents = round(invoiceCentsByProvider[provider] ?? 0);
        const varianceCents = round(invoiceCents - ourCents);
        const variancePct = invoiceCents === 0
            ? (ourCents === 0 ? 0 : 100)
            : round((varianceCents / invoiceCents) * 100);

        return {
            provider,
            ourCents,
            invoiceCents,
            varianceCents,
            variancePct,
            withinTolerance: Math.abs(variancePct) <= RECONCILE_TOLERANCE_PCT,
        };
    });
}

// ── presentation ───────────────────────────────────────────────────────────

const rupees = (cents: number) => `₹${(cents / 100).toFixed(2)}`;

function sliceTable(title: string, slices: Record<string, Slice>): string[] {
    const rows = Object.entries(slices).sort((a, b) => b[1].costCents - a[1].costCents);
    if (rows.length === 0) return [];

    return [
        '',
        `### ${title}`,
        '',
        '| | Calls | Tokens | Cost | Failed |',
        '|---|---:|---:|---:|---:|',
        ...rows.map(([k, s]) =>
            `| ${k} | ${s.calls} | ${s.tokens.toLocaleString()} | ${rupees(s.costCents)} | ${s.failed} |`),
    ];
}

/** The dashboard as markdown — what D17 publishes and D20 reads its number from. */
export function renderDashboard(d: CostDashboard): string {
    const lines = [
        '# AI spend',
        '',
        `**${rupees(d.total.costCents)}** across ${d.total.calls} calls · `
        + `${d.generations} generations · ${d.users} users`,
        '',
        '| Metric | Value |',
        '|---|---|',
        `| Cost per user | ${d.costPerUserCents === null ? '— (no attributed usage)' : rupees(d.costPerUserCents)} |`,
        `| Cost per generation | ${d.costPerGenerationCents === null ? '—' : rupees(d.costPerGenerationCents)} |`,
        `| Total tokens | ${d.total.tokens.toLocaleString()} |`,
        `| Failure rate | ${(d.failureRate * 100).toFixed(1)}% |`,
        `| Spend on failed calls | ${rupees(d.wastedCents)} |`,
        `| Unattributed calls | ${d.unattributedCalls} |`,
        ...(d.unpricedProviders.length ? [
            '',
            `> **Unpriced, not free.** ${d.unpricedProviders.join(', ')} spent tokens at a rate`
            + ' card of zero. On a free tier that is accurate; after billing is enabled it means'
            + ' the per-provider prices in config were never set, and every figure above will'
            + ' stay at zero while looking finished.',
        ] : []),
        ...sliceTable('By provider', d.byProvider),
        ...sliceTable('By stage', d.byStage),
        ...sliceTable('By model', d.byModel),
        ...sliceTable('By prompt version', d.byPromptVersion),
        ...sliceTable('By day', d.byDay),
    ];

    return lines.join('\n');
}

export function renderReconciliation(rows: Reconciliation[]): string {
    if (rows.length === 0) return '_No invoice supplied._';

    return [
        '| Provider | Ledger | Invoice | Variance | |',
        '|---|---:|---:|---:|---|',
        ...rows.map((r) =>
            `| ${r.provider} | ${rupees(r.ourCents)} | ${rupees(r.invoiceCents)} `
            + `| ${rupees(r.varianceCents)} (${r.variancePct.toFixed(1)}%) `
            + `| ${r.withinTolerance ? 'ok' : 'INVESTIGATE'} |`),
    ].join('\n');
}
