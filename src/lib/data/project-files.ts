import type { SupabaseClient } from '@supabase/supabase-js';
import type { FileMap, GetProjectFilesResponse } from '@/lib/contracts';
import { ApiError } from '@/lib/errors/respond';
import { isValidFilePath, validateFileMap } from './validate-file-map';

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

    // One statement, all or nothing: delete removed paths, upsert the rest and bump
    // projects.updated_at. A dropped connection can no longer leave a half-saved site.
    const { data, error } = await supabase.rpc('replace_project_files', {
        p_project_id: projectId,
        p_files: files,
    });

    if (error) {
        if (/project_not_found/.test(error.message)) {
            throw new ApiError('not_found', 'That project does not exist.');
        }
        throw fileLimitError(error.message)
            ?? new ApiError('internal', 'Could not save the files.', error.message);
    }

    // replace_project_files returns the project's new updated_at, so no second round trip.
    return { projectId, files, updatedAt: data as string };
}

// Bump projects.updated_at so the dashboard orders by real activity. Still used by the
// single-file write and delete paths, which do not go through replace_project_files.
//
// The column is written explicitly rather than by sending an empty update. `{ name:
// undefined }` looks like a no-op update that would still fire the set_updated_at trigger,
// but supabase-js serialises the payload with JSON.stringify, which drops undefined — so
// what reaches PostgREST is `{}`, an update with no columns to set, and every file write
// failed on it with a 500 (found by the R3 D5 acceptance).
//
// The trigger still overwrites this value with now(), so the timestamp remains the
// database's to decide; what changed is that the statement is now a valid one.
async function touchProject(supabase: SupabaseClient, projectId: string): Promise<string> {
    const { data, error } = await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select('updated_at')
        .single();

    if (error) throw new ApiError('internal', 'Could not update the project.', error.message);
    return data.updated_at;
}

// The database triggers cap files per project and total text bytes; their raised
// exceptions arrive as plain Postgres errors, so translate them into the 422 the
// contract promises instead of a bare 500.
function fileLimitError(message: string): ApiError | null {
    if (/file limit exceeded/i.test(message)) {
        return new ApiError('validation_failed', 'This project has too many files.', message);
    }
    if (/text size limit exceeded/i.test(message)) {
        return new ApiError('validation_failed', 'This project has run out of text space.', message);
    }
    return null;
}

// PUT /projects/{id}/files/{path} — upsert one file. Marks the working tree dirty by
// touching the project; never creates a commit (committing is an explicit act, V-4).
export async function putProjectFile(
    supabase: SupabaseClient,
    projectId: string,
    path: string,
    content: string,
): Promise<{ projectId: string; path: string; dirty: boolean; updatedAt: string }> {
    if (!isValidFilePath(path)) {
        throw new ApiError('validation_failed', 'That file path is not valid.', path);
    }

    await loadProject(supabase, projectId);

    const { error } = await supabase
        .from('project_files')
        .upsert({ project_id: projectId, path, content }, { onConflict: 'project_id,path' });

    if (error) {
        throw fileLimitError(error.message)
            ?? new ApiError('internal', 'Could not save the file.', error.message);
    }

    const updatedAt = await touchProject(supabase, projectId);
    return { projectId, path, dirty: true, updatedAt };
}

// DELETE /projects/{id}/files/{path}. Deleting a path that does not exist is not_found,
// so the editor can tell a stale tree from a successful delete.
export async function deleteProjectFile(
    supabase: SupabaseClient,
    projectId: string,
    path: string,
): Promise<{ projectId: string; path: string; dirty: boolean; updatedAt: string }> {
    if (!isValidFilePath(path)) {
        throw new ApiError('validation_failed', 'That file path is not valid.', path);
    }

    await loadProject(supabase, projectId);

    const { data, error } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId)
        .eq('path', path)
        .select('path');

    if (error) throw new ApiError('internal', 'Could not delete the file.', error.message);
    if (!data || data.length === 0) {
        throw new ApiError('not_found', 'That file does not exist in this project.');
    }

    const updatedAt = await touchProject(supabase, projectId);
    return { projectId, path, dirty: true, updatedAt };
}

// Single-file read for GET /projects/{id}/files/{path}. A path that is not in this
// project returns not_found rather than an empty string, so the editor can tell the
// difference between "empty file" and "no such file" (N-4).
export async function getProjectFile(
    supabase: SupabaseClient,
    projectId: string,
    path: string,
): Promise<{ projectId: string; path: string; content: string; updatedAt: string }> {
    await loadProject(supabase, projectId);

    const { data, error } = await supabase
        .from('project_files')
        .select('path, content, updated_at')
        .eq('project_id', projectId)
        .eq('path', path)
        .maybeSingle();

    if (error) throw new ApiError('internal', 'Could not read the file.', error.message);
    if (!data) throw new ApiError('not_found', 'That file does not exist in this project.');

    return { projectId, path: data.path, content: data.content, updatedAt: data.updated_at };
}