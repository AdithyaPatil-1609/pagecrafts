import type { EditProposal, SectionProps } from '@/lib/contracts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StoredEdit extends EditProposal {
    id: string;
    projectId: string;
    userId: string;
    /** Props as they stood when the proposal was made, for a stale-edit check. */
    preProps: SectionProps;
    consumed: boolean;
    preCommitSha?: string | null;
}

export interface EditStore {
    put(edit: StoredEdit): Promise<StoredEdit>;
    get(id: string): Promise<StoredEdit | undefined>;
    markConsumed(id: string): Promise<void>;
}

class MemoryEditStore implements EditStore {
    private readonly edits = new Map<string, StoredEdit>();

    async put(edit: StoredEdit): Promise<StoredEdit> {
        this.edits.set(edit.id, edit);
        return edit;
    }

    async get(id: string): Promise<StoredEdit | undefined> {
        return this.edits.get(id);
    }

    async markConsumed(id: string): Promise<void> {
        const current = this.edits.get(id);
        if (current) this.edits.set(id, { ...current, consumed: true });
    }
}

let instance: EditStore = new MemoryEditStore();

export function editStore(): EditStore {
    return instance;
}

export function setEditStore(next: EditStore | null): void {
    instance = next ?? new MemoryEditStore();
}

/** Durable when the request carries a real supabase client; memory otherwise (tests). */
export function storeFor(supabase: { from?: unknown } | undefined): EditStore {
    if (supabase && typeof supabase.from === 'function') {
        return new SupabaseEditStore(supabase as import('@supabase/supabase-js').SupabaseClient);
    }
    return editStore();
}

let counter = 0;
export function nextEditId(): string {
    counter += 1;
    return `edit_${counter}`;
}

class SupabaseEditStore implements EditStore {
    constructor(private readonly supabase: import('@supabase/supabase-js').SupabaseClient) {}

    async put(edit: StoredEdit): Promise<StoredEdit> {
        if (!UUID.test(edit.projectId) || !UUID.test(edit.userId)) {
            return editStore().put(edit);
        }
        const { error } = await this.supabase.from('ai_edit_proposals').upsert({
            id: edit.id,
            project_id: edit.projectId,
            user_id: edit.userId,
            target_section_id: edit.targetSectionId,
            patch: edit.patch,
            explanation: edit.explanation,
            pre_props: edit.preProps,
            consumed: edit.consumed,
            pre_commit_sha: edit.preCommitSha ?? null,
        });
        if (error) {
            console.warn('[edits] persist failed, keeping memory:', error.message);
            return editStore().put(edit);
        }
        return edit;
    }

    async get(id: string): Promise<StoredEdit | undefined> {
        const { data, error } = await this.supabase
            .from('ai_edit_proposals')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error || !data) return editStore().get(id);
        return {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            targetSectionId: data.target_section_id,
            patch: data.patch,
            explanation: data.explanation,
            applied: false,
            preProps: data.pre_props,
            consumed: data.consumed,
            preCommitSha: data.pre_commit_sha,
        };
    }

    async markConsumed(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('ai_edit_proposals')
            .update({ consumed: true })
            .eq('id', id);
        if (error) await editStore().markConsumed(id);
    }
}
