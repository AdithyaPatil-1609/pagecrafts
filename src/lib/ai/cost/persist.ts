import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LedgerRow, GenerationStatus } from './ledger';
import type { GenerationRow } from './dashboard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PersistContext {
    userId: string;
    projectId: string;
    prompt: string;
    jobId?: string;
}

export interface LedgerContext {
    jobId: string;
    userId: string;
    projectId: string;
    prompt: string;
}

/**
 * One `generations` row per provider call, success and failure alike (FR-026).
 *
 * Never throws — a ledger write must not fail a generation that already
 * completed. Skips when the client has no `.from` (tests) or the ids are not
 * uuids (the table FKs would reject them).
 */
export async function persistLedgerRows(
    supabase: SupabaseClient | undefined,
    ctx: PersistContext,
    rows: readonly LedgerRow[],
): Promise<void> {
    if (!supabase || typeof supabase.from !== 'function' || rows.length === 0) return;

    const userId = UUID.test(ctx.userId) ? ctx.userId : null;
    const projectId = UUID.test(ctx.projectId) ? ctx.projectId : null;
    const prompt = ctx.prompt.slice(0, 4_000);
    const promptHash = createHash('sha256').update(ctx.prompt).digest('hex');

    const payload = rows.map((r) => ({
        user_id: userId,
        project_id: projectId,
        prompt,
        prompt_hash: promptHash,
        ...(ctx.jobId ? { job_id: ctx.jobId } : {}),
        model: r.model.slice(0, 120),
        input_tokens: r.inputTokens,
        output_tokens: r.outputTokens,
        cost_cents: r.costCents,
        status: r.status,
        provider: r.provider,
        prompt_version: r.promptVersion?.slice(0, 40) ?? null,
        latency_ms: r.latencyMs,
        stage: r.stage.slice(0, 40),
    }));

    const { error } = await supabase.from('generations').insert(payload);
    if (error) console.warn('[ledger] persist failed:', error.message);
}

/**
 * Persists one row per provider invocation without retaining the user's prompt.
 *
 * The authenticated client is intentional: the generations RLS policy only
 * permits rows for the current user, so a detached job cannot accidentally
 * attribute spend to somebody else.
 */
export async function persistLedger(
    supabase: SupabaseClient,
    context: LedgerContext,
    rows: readonly LedgerRow[],
): Promise<void> {
    if (rows.length === 0) return;
    if (!supabase || typeof supabase.from !== 'function') return;

    const promptHash = createHash('sha256').update(context.prompt).digest('hex');
    const payload = rows.map((row) => ({
        job_id: context.jobId,
        user_id: context.userId,
        project_id: context.projectId,
        prompt_hash: promptHash,
        provider: row.provider,
        model: row.model,
        stage: row.stage,
        prompt_version: row.promptVersion ?? null,
        input_tokens: row.inputTokens,
        output_tokens: row.outputTokens,
        cost_cents: row.costCents,
        status: row.status,
        latency_ms: row.latencyMs,
        created_at: row.createdAt,
    }));

    const { error } = await supabase.from('generations').insert(payload);
    if (error) throw new Error(`Could not persist the AI cost ledger: ${error.message}`);
}

interface GenerationTableRow {
    user_id: string | null;
    provider: string;
    model: string;
    stage: string | null;
    prompt_version: string | null;
    input_tokens: number;
    output_tokens: number;
    cost_cents: number;
    status: string;
    latency_ms: number;
    created_at: string;
}

/** Map a `generations` row to the dashboard shape. The D20 query starts here. */
export function generationRowFromTable(row: GenerationTableRow): GenerationRow {
    return {
        userId: row.user_id,
        provider: row.provider as GenerationRow['provider'],
        model: row.model,
        stage: row.stage ?? undefined,
        promptVersion: row.prompt_version ?? undefined,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        costCents: row.cost_cents,
        status: row.status as GenerationStatus,
        latencyMs: row.latency_ms,
        createdAt: row.created_at,
    };
}

/**
 * Load priced calls for the dashboard. Soft-fails: a missing table or a
 * column Adithya has not migrated yet must not crash a cost read.
 */
export async function loadGenerationRows(
    supabase: SupabaseClient | undefined,
): Promise<GenerationRow[]> {
    if (!supabase || typeof supabase.from !== 'function') return [];

    const { data, error } = await supabase
        .from('generations')
        .select(
            'user_id, provider, model, stage, prompt_version, input_tokens, output_tokens, '
            + 'cost_cents, status, latency_ms, created_at',
        );

    if (error) {
        console.warn('[ledger] load failed:', error.message);
        return [];
    }

    return ((data ?? []) as unknown as GenerationTableRow[]).map(generationRowFromTable);
}
