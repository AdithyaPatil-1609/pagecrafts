import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { MAX_CLASSIFY_CHARS } from '@/lib/contracts';
import { jobStore, nextJobId } from '@/lib/ai/jobs/store';
import { runJob } from '@/lib/ai/jobs/runner';
import { checkGenerationBudget } from '@/lib/ai/jobs/budget';
import { persistLedger } from '@/lib/ai/cost/persist';
import { guardAiRequest } from '@/lib/limits/ai-guard';
import { TEMPLATES } from '@/lib/templates';
import { persistGeneratedSite } from '@/lib/ai/generate/persist';
import { recordGenerationUse } from '@/lib/ai/jobs/counters';
import {
    assertFreeGenerationAllowed,
    recordFreeGeneration,
} from '@/lib/ai/jobs/quota';
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
    schema,
    handler: async ({ body, params, userId, req, supabase }) => {
        const budget = await checkGenerationBudget(userId, params.id, body.prompt);
        if (!budget.ok) throw new ApiError(budget.code, budget.message);

        await assertFreeGenerationAllowed(params.id, userId, supabase);

        const admin = supabaseAdminOrNull();
        if (admin) setProfileStore(new SupabaseProfileStore(admin));
        await recordGenerationUse(userId, params.id);
        track('EV-04', userId, { category: 'unknown', latency_bucket: 'queued' });

        // This route returns before generation finishes, so withRoute's ordinary
        // request-scoped AI guard would release its concurrency slot too early.
        // Acquire it here and hand its lifecycle to the detached runner instead.
        const guard = await guardAiRequest(userId, req.headers);
        if (!guard.ok) return guard.response;

        let handedToRunner = false;
        try {
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
            await recordFreeGeneration(params.id);

            void runJob(job, {
                templates: TEMPLATES,
                recordUsage: guard.recordUsage,
                persistLedger: (rows) => persistLedger(supabase, {
                    jobId: job.id,
                    userId,
                    projectId: params.id,
                    prompt: body.prompt,
                }, rows),
                persistSite: (settled) => persistGeneratedSite(supabase, params.id, settled, TEMPLATES),
                release: guard.release,
                onSettled: (settled) => {
                    const elapsed = (settled.endedAt ?? Date.now()) - settled.startedAt;
                    track('EV-05', userId, {
                        category: settled.composition?.vertical ? 'classified' : 'fallback',
                        latency_bucket: latencyBucket(elapsed),
                    });
                },
            }).catch((err) => console.error('[generate]', err));
            handedToRunner = true;

            return ok({ job_id: job.id }, 202);
        } finally {
            if (!handedToRunner) await guard.release();
        }
    },
});

function latencyBucket(ms: number): string {
    if (ms < 15_000) return '0-15s';
    if (ms < 30_000) return '15-30s';
    if (ms < 45_000) return '30-45s';
    return '45s+';
}
