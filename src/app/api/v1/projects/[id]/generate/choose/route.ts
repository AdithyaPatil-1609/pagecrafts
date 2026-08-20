import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { jobStore } from '@/lib/ai/jobs/store';
import { STYLE_IDS } from '@/lib/ai/generate/styles';
import { persistStyleOption } from '@/lib/ai/generate/persist';
import { hasPremium, hasPro, PAID_DESIGN_MESSAGE } from '@/lib/data/entitlements';
import { requiredPlanForStyle } from '@/lib/payments/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const schema = z.object({
    jobId: z.string().min(1),
    variantId: z.enum(STYLE_IDS),
});

// POST /api/v1/projects/{id}/generate/choose — persist the look the person picked.
export const POST = withRoute<z.infer<typeof schema>, Params>({
    auth: 'required',
    schema,
    handler: async ({ body, params, userId, supabase }) => {
        const job = await jobStore().get(body.jobId);
        if (!job || job.userId !== userId || job.projectId !== params.id) {
            throw new ApiError('not_found', 'No such job.');
        }
        if (job.status !== 'done') {
            throw new ApiError('validation_failed', 'That site is still being generated.');
        }

        const option = job.variants?.find((item) => item.id === body.variantId);
        if (!option) {
            throw new ApiError('validation_failed', 'That look is not available.');
        }

        const need = requiredPlanForStyle(option.tier);
        if (need === 'premium' && !(await hasPremium(supabase, userId))) {
            throw new ApiError('payment_required', PAID_DESIGN_MESSAGE);
        }
        if (need === 'pro' && !(await hasPro(supabase, userId))) {
            throw new ApiError('payment_required', PAID_DESIGN_MESSAGE);
        }

        await persistStyleOption(supabase, params.id, option);
        await jobStore().update(job.id, {
            composition: option.composition,
            files: option.files,
        });

        return ok({ id: params.id, variant_id: option.id });
    },
});
