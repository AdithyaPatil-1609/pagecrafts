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

            // Not awaited: the caller polls GET /jobs/{id} rather than holding the request
            // open for the ~40s a generation takes. The runner keeps the slot, spend counter
            // and ledger alive until its terminal state.
            void runJob(job, {
                recordUsage: guard.recordUsage,
                persistLedger: (rows) => persistLedger(supabase, {
                    jobId: job.id,
                    userId,
                    projectId: params.id,
                    prompt: body.prompt,
                }, rows),
                release: guard.release,
            }).catch((err) => console.error('[generate]', err));
            handedToRunner = true;

            return ok({ job_id: job.id }, 202);
        } finally {
            if (!handedToRunner) await guard.release();
        }
    },
});
