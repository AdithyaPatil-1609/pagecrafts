import type { SupabaseClient } from '@supabase/supabase-js';

import type { ContentSchema, FileMap, Template } from '@/lib/contracts';
import { putProjectFiles } from '@/lib/data/project-files';
import { createCommit } from '@/lib/data/commits';
import { contentFromFiles } from '@/lib/content/from-files';
import type { Job } from '../jobs/types';
import type { StyleOption } from './options';
import { contentFromComposition, schemaFromComposition } from './schema';

/**
 * Write a finished generation into the project the person is about to open.
 *
 * `runJob` used to stop at a Composition in memory. The editor reads files,
 * content_schema and content_json from the project row — so a generation that
 * never reaches those columns is a blank site, and the funnel looks like it
 * only ranked templates.
 */
export async function persistGeneratedSite(
    supabase: SupabaseClient,
    projectId: string,
    job: Job,
    templates: readonly Template[] = [],
): Promise<void> {
    if (typeof supabase.from !== 'function') return;

    if (job.composition && job.files && Object.keys(job.files).length > 0) {
        const files: FileMap = {
            ...job.files,
            'composition.json': JSON.stringify(job.composition, null, 2),
        };
        const schema = schemaFromComposition(job.composition);
        const content = {
            ...contentFromFiles(files, schema),
            ...contentFromComposition(job.composition),
        };
        const title = job.composition.meta.title.slice(0, 80) || undefined;
        await writeSite(supabase, projectId, {
            files,
            schema,
            content,
            title,
            description: job.composition.meta.description,
            commitMessage: 'Generated from your description',
        });
        return;
    }

    if (!job.fallbackTemplateId) return;

    const template = templates.find((t) => t.id === job.fallbackTemplateId);
    if (!template) return;

    // This branch is a substitute, not a result: generation threw and the runner picked the
    // nearest design it could find. It used to be written exactly like a success -- the
    // project renamed to the template's name and the template's own title dropped over the
    // person's. Somebody who asked for "1947 Restaurant" opened a project called
    // "Architecture" with none of their facts on it and nothing anywhere saying why.
    //
    // So keep what they typed. The design underneath is ours to choose when we have failed;
    // the name of their business is not.
    const { data: existing } = await supabase
        .from('projects')
        .select('name, site_meta')
        .eq('id', projectId)
        .maybeSingle();

    const theirName = typeof existing?.name === 'string' ? existing.name.trim() : '';
    const theirMeta = (existing?.site_meta ?? {}) as { title?: string; description?: string };

    await writeSite(supabase, projectId, {
        files: template.files,
        schema: template.contentSchema,
        content: contentFromFiles(template.files, template.contentSchema),
        title: theirMeta.title || theirName || template.name.slice(0, 80),
        description: theirMeta.description || template.description,
        rename: false,
        commitMessage: `Could not generate this — started you on ${template.name} instead`,
    });
}

async function writeSite(
    supabase: SupabaseClient,
    projectId: string,
    input: {
        files: FileMap;
        schema: ContentSchema;
        content: Record<string, unknown>;
        title?: string;
        description?: string;
        // A real generation named the site, so the project takes that name. A fallback did
        // not, so it must leave the name alone. Default true, because every caller that
        // produced the site it is writing wants it.
        rename?: boolean;
        commitMessage: string;
    },
): Promise<void> {
    await putProjectFiles(supabase, projectId, input.files);

    const { error } = await supabase
        .from('projects')
        .update({
            content_schema: input.schema,
            content_json: input.content,
            site_meta: {
                ...(input.title ? { title: input.title } : {}),
                ...(input.description ? { description: input.description } : {}),
            },
            ...(input.title && input.rename !== false ? { name: input.title } : {}),
        })
        .eq('id', projectId);

    if (error) {
        throw new Error(`Could not seed generated content: ${error.message}`);
    }

    await createCommit(supabase, projectId, input.commitMessage, 'system', input.files);
}

/** Persist the look the person picked. */
export async function persistStyleOption(
    supabase: SupabaseClient,
    projectId: string,
    option: StyleOption,
): Promise<void> {
    if (typeof supabase.from !== 'function') return;

    const files: FileMap = {
        ...option.files,
        'composition.json': JSON.stringify(option.composition, null, 2),
    };
    const schema = schemaFromComposition(option.composition);
    const content = {
        ...contentFromFiles(files, schema),
        ...contentFromComposition(option.composition),
    };
    const title = option.composition.meta.title.slice(0, 80) || undefined;
    await writeSite(supabase, projectId, {
        files,
        schema,
        content,
        title,
        description: option.composition.meta.description,
        commitMessage: `Generated — ${option.label} look`,
    });
}
