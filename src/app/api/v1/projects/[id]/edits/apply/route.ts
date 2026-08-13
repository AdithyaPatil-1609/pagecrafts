import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { storeFor } from '@/lib/ai/edit/store';
import { applyProposal, ApplyError } from '@/lib/ai/edit/apply';
import { MigrationError, parseStoredComposition } from '@/lib/ai/composition/migrate';
import { putProjectFile } from '@/lib/data/project-files';
import type { Composition } from '@/lib/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const schema = z.object({
    edit_id: z.string().min(1),
    composition: z.unknown(),
});

// POST /api/v1/projects/{id}/edits/apply — the only write path for an AI edit.
// A separate directory, not a flag on the propose route (C-03, AC-F6-3).
export const POST = withRoute<z.infer<typeof schema>, Params>({
    auth: 'required',
    schema,
    handler: async ({ body, params, userId, supabase }) => {
        let currentComposition;
        try {
            currentComposition = parseStoredComposition(body.composition);
        } catch (err) {
            if (err instanceof MigrationError) {
                throw new ApiError('validation_failed', err.message);
            }
            throw err;
        }

        const store = storeFor(supabase);
        const stored = await store.get(body.edit_id);
        if (!stored || stored.userId !== userId || stored.projectId !== params.id) {
            throw new ApiError('not_found', 'That edit does not exist.');
        }
        if (stored.consumed) {
            throw new ApiError('conflict', 'That edit was already applied.');
        }

        const current = currentComposition.sections.find((s) => s.id === stored.targetSectionId);
        if (!current) {
            throw new ApiError('validation_failed', 'That section is no longer on the page.');
        }

        if (JSON.stringify(current.props) !== JSON.stringify(stored.preProps)) {
            throw new ApiError('conflict', 'The section changed since this edit was proposed.');
        }

        let nextSection;
        try {
            nextSection = applyProposal(current, stored);
        } catch (err) {
            if (err instanceof ApplyError) {
                throw new ApiError('validation_failed', err.message);
            }
            throw err;
        }

        const composition: Composition = {
            ...currentComposition,
            sections: currentComposition.sections.map((s) =>
                s.id === nextSection.id ? nextSection : s),
        };

        await putProjectFile(
            supabase,
            params.id,
            'composition.json',
            JSON.stringify(composition, null, 2),
        );
        await store.markConsumed(stored.id);

        return ok({ applied: true, composition, edit_id: stored.id }, 201);
    },
});
