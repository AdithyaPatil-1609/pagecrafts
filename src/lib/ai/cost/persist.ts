import type { SupabaseClient } from '@supabase/supabase-js';
import type { LedgerRow, GenerationStatus } from './ledger';
import type { GenerationRow } from './dashboard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PersistContext {
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

    const payload = rows.map((r) => ({
        user_id: userId,
        project_id: projectId,
        prompt,
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

    return ((data ?? []) as GenerationTableRow[]).map(generationRowFromTable);
}
