import 'server-only';

import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { jobStore } from '@/lib/ai/jobs/store';
import { attemptsFromJobs, publicVariant } from '@/lib/ai/jobs/attempts';
import { readGenerationQuota } from '@/lib/ai/jobs/quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

// GET /api/v1/jobs/{id} — poll for progress. SSE is the richer path; this one
// works everywhere and is the fallback when a proxy blocks streaming.
export const GET = withRoute<undefined, Params>({
    auth: 'required',
    handler: async ({ params, userId, supabase }) => {
        const job = await jobStore().get(params.id);

        // Another user's job is not_found, never forbidden — its existence is not ours to leak.
        if (!job || job.userId !== userId) {
            throw new ApiError('not_found', 'No such job.');
        }

        const siblings = await jobStore().listByProject(job.projectId);
        const attempts = attemptsFromJobs(siblings);
        const quota = await readGenerationQuota(job.projectId, userId, supabase);

        return ok({
            status: job.status,
            prompt: job.prompt,
            sections_done: job.sectionsDone,
            sections_total: job.sectionsTotal,
            provider: job.provider,
            elapsed_ms: (job.endedAt ?? Date.now()) - job.startedAt,
            quota,
            attempts,
            ...(job.fallbackTemplateId ? { fallback_template_id: job.fallbackTemplateId } : {}),
            ...(job.error ? { error: job.error } : {}),
            ...(job.composition ? { composition: job.composition } : {}),
            files_ready: Boolean(job.files && Object.keys(job.files).length),
            ...(job.variants?.length ? {
                variants: job.variants.map(publicVariant),
            } : {}),
        });
    },
});
