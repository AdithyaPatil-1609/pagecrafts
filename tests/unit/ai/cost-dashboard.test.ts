import { describe, it, expect } from 'vitest';
import {
    buildDashboard, reconcile, renderDashboard, renderReconciliation,
    RECONCILE_TOLERANCE_PCT, costForUser, type GenerationRow,
} from '@/lib/ai/cost/dashboard';

const row = (over: Partial<GenerationRow> = {}): GenerationRow => ({
    userId: 'u1',
    provider: 'groq',
    model: 'gpt-oss-120b',
    stage: 'fill',
    promptVersion: 'fill-section.v1',
    inputTokens: 800,
    outputTokens: 400,
    costCents: 1,
    status: 'completed',
    latencyMs: 900,
    createdAt: '2026-08-12T10:00:00.000Z',
    ...over,
});

describe('cost dashboard — totals and slices', () => {
    it('totals calls, tokens and cost', () => {
        const d = buildDashboard([row(), row(), row({ costCents: 2 })]);

        expect(d.total.calls).toBe(3);
        expect(d.total.tokens).toBe(3_600);
        expect(d.total.costCents).toBe(4);
    });

    it('splits by provider, for invoice reconciliation', () => {
        const d = buildDashboard([
            row({ provider: 'groq', costCents: 1 }),
            row({ provider: 'gemini', costCents: 3 }),
            row({ provider: 'gemini', costCents: 2 }),
        ]);

        expect(d.byProvider.groq.costCents).toBe(1);
        expect(d.byProvider.gemini).toMatchObject({ calls: 2, costCents: 5 });
    });

    it('splits by stage, so it is visible where the money goes', () => {
        const d = buildDashboard([
            row({ stage: 'classify', costCents: 0.1 }),
            row({ stage: 'fill', costCents: 1 }),
            row({ stage: 'fill', costCents: 1 }),
        ]);

        expect(d.byStage.fill.costCents).toBe(2);
        expect(d.byStage.classify.calls).toBe(1);
    });

    it('attributes spend to the prompt version that produced it', () => {
        const d = buildDashboard([
            row({ promptVersion: 'fill-section.v1', costCents: 2 }),
            row({ promptVersion: 'fill-section.v2', costCents: 3 }),
        ]);

        expect(d.byPromptVersion['fill-section.v2'].costCents).toBe(3);
    });

    it('buckets a missing prompt version rather than dropping the row', () => {
        const d = buildDashboard([row({ promptVersion: undefined, costCents: 5 })]);
        expect(d.byPromptVersion.unversioned.costCents).toBe(5);
    });

    it('groups by UTC day for the trend', () => {
        const d = buildDashboard([
            row({ createdAt: '2026-08-11T23:00:00.000Z' }),
            row({ createdAt: '2026-08-12T01:00:00.000Z' }),
        ]);
        expect(Object.keys(d.byDay).sort()).toEqual(['2026-08-11', '2026-08-12']);
    });
});

describe('cost per user — D20', () => {
    it('divides attributed spend by distinct users', () => {
        const d = buildDashboard([
            row({ userId: 'u1', costCents: 4 }),
            row({ userId: 'u2', costCents: 6 }),
        ]);

        expect(d.users).toBe(2);
        expect(d.costPerUserCents).toBe(5);
    });

    /**
     * An eval run is real money but it is not a user's cost. Folding it in
     * makes the launch-day number look worse than the product is, and the
     * number is meant to answer "what does a user cost us".
     */
    it('excludes unattributed spend from cost-per-user but not from the total', () => {
        const d = buildDashboard([
            row({ userId: 'u1', costCents: 4 }),
            row({ userId: null, costCents: 96 }),
        ]);

        expect(d.total.costCents).toBe(100);
        expect(d.unattributedCalls).toBe(1);
        expect(d.costPerUserCents).toBe(4);
    });

    it('reports null rather than zero when nobody has used it yet', () => {
        const d = buildDashboard([row({ userId: null })]);
        expect(d.costPerUserCents).toBeNull();
    });

    it('handles an empty ledger without dividing by zero', () => {
        const d = buildDashboard([]);
        expect(d.costPerUserCents).toBeNull();
        expect(d.costPerGenerationCents).toBeNull();
        expect(d.failureRate).toBe(0);
    });

    it('counts a multi-call generation once', () => {
        // Nine calls, one user, one minute — one generation.
        const calls = Array.from({ length: 9 }, () => row({ costCents: 1 }));
        const d = buildDashboard(calls);

        expect(d.generations).toBe(1);
        expect(d.costPerGenerationCents).toBe(9);
    });

    it('separates two generations a user made at different times', () => {
        const d = buildDashboard([
            row({ createdAt: '2026-08-12T10:00:00.000Z' }),
            row({ createdAt: '2026-08-12T11:30:00.000Z' }),
        ]);
        expect(d.generations).toBe(2);
    });

    it('uses the persisted job id instead of merging quick retries in one minute', () => {
        const d = buildDashboard([
            row({ generationId: 'job_1', createdAt: '2026-08-12T10:00:01.000Z' }),
            row({ generationId: 'job_2', createdAt: '2026-08-12T10:00:02.000Z' }),
        ]);
        expect(d.generations).toBe(2);
    });
});

describe('waste and failure', () => {
    it('prices the calls that produced nothing', () => {
        const d = buildDashboard([
            row({ status: 'completed', costCents: 1 }),
            row({ status: 'failed', costCents: 2 }),
            row({ status: 'rejected', costCents: 1 }),
        ]);

        expect(d.total.failed).toBe(2);
        expect(d.wastedCents).toBe(3);
        expect(d.failureRate).toBeCloseTo(2 / 3);
    });
});

describe('reconciliation — NFR-142', () => {
    const dashboard = buildDashboard([
        row({ provider: 'groq', costCents: 100 }),
        row({ provider: 'gemini', costCents: 50 }),
    ]);

    it('passes when the invoice matches within tolerance', () => {
        const [gemini, groq] = reconcile(dashboard, { gemini: 51, groq: 102 });

        expect(groq.withinTolerance).toBe(true);
        expect(gemini.withinTolerance).toBe(true);
        expect(groq.varianceCents).toBe(2);
    });

    it('flags a gap worth investigating', () => {
        const rows = reconcile(dashboard, { groq: 400, gemini: 50 });
        const groq = rows.find((r) => r.provider === 'groq');

        expect(groq?.withinTolerance).toBe(false);
        expect(groq?.variancePct).toBeGreaterThan(RECONCILE_TOLERANCE_PCT);
    });

    /** Calls we never priced — the case that matters most. */
    it('flags a provider that invoiced us but the ledger never saw', () => {
        const rows = reconcile(dashboard, { groq: 100, gemini: 50, cerebras: 250 });
        const cerebras = rows.find((r) => r.provider === 'cerebras');

        expect(cerebras?.ourCents).toBe(0);
        expect(cerebras?.withinTolerance).toBe(false);
    });

    it('treats zero-on-both-sides as reconciled', () => {
        const [only] = reconcile(buildDashboard([]), { groq: 0 });
        expect(only.withinTolerance).toBe(true);
    });
});

describe('rendering', () => {
    it('leads with the number D20 needs', () => {
        const md = renderDashboard(buildDashboard([
            row({ userId: 'u1', costCents: 250 }),
            row({ userId: 'u2', costCents: 150 }),
        ]));

        expect(md).toContain('Cost per user');
        expect(md).toContain('₹2.00');
        expect(md).toContain('By provider');
        expect(md).toContain('By stage');
    });

    it('says plainly when there is no attributed usage yet', () => {
        const md = renderDashboard(buildDashboard([row({ userId: null })]));
        expect(md).toContain('no attributed usage');
    });

    it('marks a variance that needs investigating', () => {
        const md = renderReconciliation(
            reconcile(buildDashboard([row({ provider: 'groq', costCents: 10 })]), { groq: 100 }),
        );
        expect(md).toContain('INVESTIGATE');
    });

    it('does not pretend to reconcile without an invoice', () => {
        expect(renderReconciliation([])).toContain('No invoice supplied');
    });
});

describe('zero-request edit share — D17', () => {
    it('is null when no edit ops have been recorded — not 0%', () => {
        const d = buildDashboard([row()]);
        expect(d.editOps.share).toBeNull();
        expect(renderDashboard(d)).toContain('no edit ops recorded');
    });

    it('reports the proportion of edits that never called a provider', () => {
        const d = buildDashboard([row()], [
            { kind: 'zero-request', op: 'reorder', at: '2026-08-14T10:00:00.000Z' },
            { kind: 'zero-request', op: 'hide', at: '2026-08-14T10:00:01.000Z' },
            { kind: 'zero-request', op: 'restyle', at: '2026-08-14T10:00:02.000Z' },
            { kind: 'provider', op: 'propose', at: '2026-08-14T10:00:03.000Z' },
        ]);

        expect(d.editOps.total).toBe(4);
        expect(d.editOps.zeroRequest).toBe(3);
        expect(d.editOps.share).toBe(0.75);
        expect(renderDashboard(d)).toContain('75% (3/4)');
    });
});

describe('cost for one user — D20 query', () => {
    it('answers what one user cost, not only the mean', () => {
        const rows = [
            row({ userId: 'u1', costCents: 4 }),
            row({ userId: 'u1', costCents: 6 }),
            row({ userId: 'u2', costCents: 100 }),
        ];
        const d = buildDashboard(rows);

        expect(d.byUser.u1.costCents).toBe(10);
        expect(d.byUser.u2.costCents).toBe(100);
        expect(costForUser(rows, 'u1')).toBe(10);
        expect(costForUser(rows, 'nobody')).toBe(0);
    });
});
