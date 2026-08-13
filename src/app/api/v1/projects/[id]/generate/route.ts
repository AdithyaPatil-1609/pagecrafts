import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { MAX_CLASSIFY_CHARS } from '@/lib/contracts';
import { jobStore, nextJobId } from '@/lib/ai/jobs/store';
import { runJob } from '@/lib/ai/jobs/runner';
import { checkGenerationBudget } from '@/lib/ai/jobs/budget';
import { persistLedgerRows } from '@/lib/ai/cost/persist';
import { TEMPLATES } from '@/lib/templates';
import { putProjectFile } from '@/lib/data/project-files';
import { recordGenerationUse } from '@/lib/ai/jobs/counters';
import { supabaseAdminOrNull } from '@/lib/data/supabase-admin';
import { setProfileStore } from '@/lib/ai/profile-cache';
import { SupabaseProfileStore } from '@/lib/ai/profile/persist';
import { track } from '@/lib/observability/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const schema = z.object({ prompt: z.string().min(1).max(MAX_CLASSIFY_CHARS) });

// POST /api/v1/projects/{id}/generate — 202 with a job id; the work runs after.
export const POST = withRoute<z.infer<typeof schema>, Params>({
    auth: 'required',
    limit: 'ai',
    schema,
    handler: async ({ body, params, userId, supabase }) => {
        const budget = await checkGenerationBudget(userId, params.id, body.prompt);
        if (!budget.ok) throw new ApiError(budget.code, budget.message);

        const admin = supabaseAdminOrNull();
        if (admin) setProfileStore(new SupabaseProfileStore(admin));
        await recordGenerationUse(userId, params.id);
        track('EV-04', userId, { category: 'unknown', latency_bucket: 'queued' });

        const job = await jobStore().create({
            id: nextJobId(),
            projectId: params.id,
            userId,
            prompt: body.prompt,
            status: 'queued',
            sectionsDone: 0,
            sectionsTotal: 0,
            startedAt: Date.now(),
            events: [],
            ledger: [],
        });

        // Not awaited: the caller polls GET /jobs/{id} rather than holding the request
        // open for the ~40s a generation takes.
        void runJob(job, {
            templates: TEMPLATES,
            persistLedger: (rows) => persistLedgerRows(supabase, {
                userId, projectId: params.id, prompt: body.prompt,
            }, rows),
            persistComposition: async (composition) => {
                if (typeof supabase.from !== 'function') return;
                try {
                    await putProjectFile(
                        supabase,
                        params.id,
                        'composition.json',
                        JSON.stringify(composition, null, 2),
                    );
                } catch (err) {
                    console.warn(
                        '[generate] persist composition',
                        err instanceof Error ? err.message : err,
                    );
                }
            },
            onSettled: (settled) => {
                const elapsed = (settled.endedAt ?? Date.now()) - settled.startedAt;
                track('EV-05', userId, {
                    category: settled.composition?.vertical ? 'classified' : 'fallback',
                    latency_bucket: latencyBucket(elapsed),
                });
            },
        }).catch((err) => console.error('[generate]', err));

        return ok({ job_id: job.id }, 202);
    },
});

function latencyBucket(ms: number): string {
    if (ms < 15_000) return '0-15s';
    if (ms < 30_000) return '15-30s';
    if (ms < 45_000) return '30-45s';
    return '45s+';
}
