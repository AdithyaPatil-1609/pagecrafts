import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok } from '@/lib/errors/respond';
import { proposeEdit } from '@/lib/ai/edit/propose';
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
    handler: async ({ body }) => {
        const section: SectionInstance = {
            ...body.section,
            visible: true,
            locked: false,
            source: 'ai',
        } as SectionInstance;

        const { data } = await proposeEdit(section, body.instruction);
        return ok(data);
    },
});
