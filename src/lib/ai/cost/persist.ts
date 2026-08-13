import type { SupabaseClient } from '@supabase/supabase-js';
import type { LedgerRow } from './ledger';

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
