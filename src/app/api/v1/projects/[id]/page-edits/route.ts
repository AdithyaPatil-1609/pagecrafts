import 'server-only';

import { z } from 'zod';
import { withRoute } from '@/lib/kernel/with-route';
import { ok, ApiError } from '@/lib/errors/respond';
import { getProject } from '@/lib/data/projects';
import { getProjectFiles } from '@/lib/data/project-files';
import { assertCanEdit } from '@/lib/data/entitlements';
import { asContentSchema } from '@/lib/content/schema';
import { rewritePageHtml } from '@/lib/ai/edit/rewrite-page';
import { styleUpgradeFirewall } from '@/lib/editor/style-firewall';
import { crossVerticalFirewall } from '@/lib/editor/cross-vertical-firewall';
import { offTopicWebsiteAsk } from '@/lib/editor/website-ask-gate';
import { resolveSiteVertical } from '@/lib/editor/resolve-site-vertical';
import { parseComposition } from '@/lib/editor/parse-composition';
import { persistLedger } from '@/lib/ai/cost/persist';
import { rowFor } from '@/lib/ai/cost/ledger';
import { nextJobId } from '@/lib/ai/jobs/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { id: string };

const schema = z.object({
    instruction: z.string().min(1).max(300),
});

function entryHtml(files: Record<string, string>): string | null {
    if (files['index.html']) return 'index.html';
    return Object.keys(files).find((name) => /\.html?$/i.test(name)) ?? null;
}

// POST /api/v1/projects/{id}/page-edits — layout-aware HTML suggestion (CSS + snippets).
export const POST = withRoute<z.infer<typeof schema>, Params>({
    auth: 'required',
    limit: 'ai',
    schema,
    handler: async ({ body, params, userId, supabase, recordUsage }) => {
        await assertCanEdit(supabase, userId, params.id);

        const offTopic = offTopicWebsiteAsk(body.instruction);
        if (offTopic) {
            throw new ApiError('validation_failed', offTopic);
        }

        const project = await getProject(supabase, params.id);
        const tree = await getProjectFiles(supabase, params.id);
        const path = entryHtml(tree.files);
        if (!path) {
            throw new ApiError(
                'validation_failed',
                'This site has no HTML page to edit yet. Generate or open a page first.',
            );
        }

        const before = tree.files[path] ?? '';
        if (!before.trim()) {
            throw new ApiError('validation_failed', 'The home page file is empty.');
        }

        const composition = parseComposition(tree.files['composition.json']);
        const contentSchema = asContentSchema(project.contentSchema);
        const contextText = [
            composition?.meta.title,
            project.siteMeta?.title,
            project.name,
            before.slice(0, 4000),
        ]
            .filter(Boolean)
            .join(' ');

        const styleBlocked = styleUpgradeFirewall({
            instruction: body.instruction,
            html: before,
            composition,
        });
        if (styleBlocked) {
            throw new ApiError('validation_failed', styleBlocked);
        }

        const crossBlocked = crossVerticalFirewall({
            instruction: body.instruction,
            vertical: resolveSiteVertical({
                composition,
                sourceTemplateId: project.sourceTemplateId,
                contextText,
            }),
            sectionCount: composition?.sections.length ?? 0,
            hasContentPage: contentSchema.sections.length > 0,
            contextText,
        });
        if (crossBlocked) {
            throw new ApiError('validation_failed', crossBlocked);
        }

        let rewritten;
        try {
            rewritten = await rewritePageHtml(before, body.instruction);
        } catch (error) {
            const detail =
                error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : 'The page suggestion could not be prepared. Try again.';
            throw new ApiError('validation_failed', detail);
        }

        await Promise.all([
            recordUsage(rewritten.usage),
            persistLedger(
                supabase,
                {
                    jobId: nextJobId(),
                    userId,
                    projectId: params.id,
                    prompt: body.instruction,
                },
                [rowFor('edit', rewritten.usage, 'completed')],
            ),
        ]);

        return ok({
            path,
            before,
            after: rewritten.html,
            explanation: rewritten.explanation,
        });
    },
});
