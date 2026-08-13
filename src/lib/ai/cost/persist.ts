import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LedgerRow } from './ledger';

export interface LedgerContext {
    jobId: string;
    userId: string;
    projectId: string;
    prompt: string;
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
