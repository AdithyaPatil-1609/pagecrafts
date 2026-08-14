import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { proposeEdit } from '@/lib/ai/edit/propose';
import { recordEditOp } from '@/lib/ai/cost/edit-ops';
import { storeFor, nextEditId } from '@/lib/ai/edit/store';
import { createCommit } from '@/lib/data/commits';
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
    handler: async ({ body, params, userId, supabase }) => {
        let preCommitSha: string | null = null;
        if (typeof supabase.from === 'function') {
            try {
                const { sha } = await createCommit(supabase, params.id, 'Before AI edit', 'system');
                preCommitSha = sha;
            } catch (err) {
                if (!(err instanceof ApiError && err.code === 'not_found')) throw err;
            }
        }

        const section: SectionInstance = {
            ...body.section,
            visible: true,
            locked: false,
            source: 'ai',
        } as SectionInstance;

        const { data } = await proposeEdit(section, body.instruction);
        recordEditOp('provider', 'propose');
        const stored = await storeFor(supabase).put({
            ...data,
            id: nextEditId(),
            projectId: params.id,
            userId,
            preProps: { ...section.props },
            consumed: false,
            preCommitSha,
        });

        return ok({
            ...data,
            edit_id: stored.id,
            pre_commit_sha: preCommitSha,
            target_section_id: stored.targetSectionId,
        });
    },
});
