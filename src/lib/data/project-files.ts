import type { SupabaseClient } from '@supabase/supabase-js';
import type { FileMap, GetProjectFilesResponse } from '@/lib/contracts';
import { ApiError } from '@/lib/errors/respond';
import { validateFileMap } from './validate-file-map';

async function loadProject(supabase: SupabaseClient, projectId: string) {
    const { data, error } = await supabase
        .from('projects')
        .select('id, updated_at')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw new ApiError('internal', 'Could not read the project.', error.message);
    if (!data) throw new ApiError('not_found', 'That project does not exist.');

    return data;
}

export async function getProjectFiles(
    supabase: SupabaseClient,
    projectId: string,
): Promise<GetProjectFilesResponse> {
    const project = await loadProject(supabase, projectId);

    const { data, error } = await supabase
        .from('project_files')
        .select('path, content')
        .eq('project_id', projectId);

    if (error) throw new ApiError('internal', 'Could not read the files.', error.message);

    const files: FileMap = {};
    for (const row of data ?? []) files[row.path] = row.content;

    return { projectId, files, updatedAt: project.updated_at };
}

export async function putProjectFiles(
    supabase: SupabaseClient,
    projectId: string,
    files: FileMap,
): Promise<GetProjectFilesResponse> {
    const issues = validateFileMap(files);
    if (issues.length > 0) {
        throw new ApiError(
            'validation_failed',
            'Some files were rejected.',
            issues.map((i) => `${i.path}: ${i.message}`).join('; '),
        );
    }

    await loadProject(supabase, projectId);

    const keep = Object.keys(files);

    const { error: deleteError } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId)
        .not('path', 'in', `(${keep.map((p) => `"${p}"`).join(',')})`);

    if (deleteError) {
        throw new ApiError('internal', 'Could not remove old files.', deleteError.message);
    }

    const rows = keep.map((path) => ({ project_id: projectId, path, content: files[path] }));

    const { error: upsertError } = await supabase
        .from('project_files')
        .upsert(rows, { onConflict: 'project_id,path' });

    if (upsertError) {
        throw new ApiError('internal', 'Could not save the files.', upsertError.message);
    }

    const { data: touched, error: touchError } = await supabase
        .from('projects')
        .update({ name: undefined })
        .eq('id', projectId)
        .select('updated_at')
        .single();

    if (touchError) {
        throw new ApiError('internal', 'Could not update the project.', touchError.message);
    }

    return { projectId, files, updatedAt: touched.updated_at };
}