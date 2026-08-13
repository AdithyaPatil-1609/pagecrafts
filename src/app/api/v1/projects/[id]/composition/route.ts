import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { artDirection, sectionInstance } from '@/lib/contracts/schemas/ai';
import { applyOps, PatchError, type CompositionOp } from '@/lib/ai/composition/patch';
import { MigrationError, parseStoredComposition } from '@/lib/ai/composition/migrate';
import { getProjectFile } from '@/lib/data/project-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const compositionOp = z.discriminatedUnion('op', [
    z.object({
        op: z.literal('reorder'),
        sectionId: z.string().min(1),
        direction: z.enum(['up', 'down']),
    }),
    z.object({ op: z.literal('hide'), sectionId: z.string().min(1) }),
    z.object({ op: z.literal('show'), sectionId: z.string().min(1) }),
    z.object({ op: z.literal('remove'), sectionId: z.string().min(1) }),
    z.object({
        op: z.literal('add'),
        section: sectionInstance,
        afterId: z.string().min(1).optional(),
    }),
    z.object({
        op: z.literal('variant'),
        sectionId: z.string().min(1),
        variant: z.string().min(1),
    }),
    z.object({
        op: z.literal('restyle'),
        artDirection: artDirection.partial(),
    }),
]);

const schema = z.object({
    ops: z.array(compositionOp).min(1).max(20),
    composition: z.unknown(),
});

function migrated(raw: unknown) {
    try {
        return parseStoredComposition(raw);
    } catch (err) {
        if (err instanceof MigrationError) {
            throw new ApiError('validation_failed', err.message);
        }
        throw err;
    }
}

// GET /api/v1/projects/{id}/composition — the stored page, migrated to the current schema.
export const GET = withRoute<undefined, Params>({
    auth: 'required',
    handler: async ({ params, supabase }) => {
        const file = await getProjectFile(supabase, params.id, 'composition.json');
        return ok({ composition: migrated(file.content) });
    },
});

// PATCH /api/v1/projects/{id}/composition — deterministic structure ops.
// This module does not import the gateway; a model call here would be a bug (TC-129).
export const PATCH = withRoute<z.infer<typeof schema>, Params>({
    auth: 'required',
    schema,
    handler: async ({ body }) => {
        try {
            const composition = applyOps(migrated(body.composition), body.ops as CompositionOp[]);
            return ok({ composition });
        } catch (err) {
            if (err instanceof PatchError) {
                throw new ApiError('validation_failed', err.message);
            }
            throw err;
        }
    },
});
