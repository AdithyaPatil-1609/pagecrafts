import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok } from '@/lib/errors/respond';
import { proposeEdit } from '@/lib/ai/edit/propose';
import { rowFor } from '@/lib/ai/cost/ledger';
import { persistLedger } from '@/lib/ai/cost/persist';
import { nextJobId } from '@/lib/ai/jobs/store';
import { SECTION_KEYS, type SectionInstance } from '@/lib/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const schema = z.object({
    instruction: z.string().min(1).max(300),
    section: z.object({
        id: z.string().min(1),
        type: z.enum(SECTION_KEYS),
        variant: z.string().min(1),
        brief: z.string().max(300).default(''),
        props: z.record(z.string(), z.unknown()).default({}),
    }),
});

// POST /api/v1/projects/{id}/edits — proposes a diff. C-03: this route has no
// write path at all, not a disabled one. Applying is a separate endpoint.
export const POST = withRoute<z.infer<typeof schema>, Params>({
    auth: 'required',
    limit: 'ai',
    schema,
    handler: async ({ body, params, userId, supabase, recordUsage }) => {
        const section: SectionInstance = {
            ...body.section,
            visible: true,
            locked: false,
            source: 'ai',
        } as SectionInstance;

        const { data, usage } = await proposeEdit(section, body.instruction);
        await Promise.all([
            recordUsage(usage),
            persistLedger(supabase, {
                jobId: nextJobId(),
                userId,
                projectId: params.id,
                prompt: body.instruction,
            }, [rowFor('edit', usage, 'completed')]),
        ]);
        return ok(data);
    },
});
