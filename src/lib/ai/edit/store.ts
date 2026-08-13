import type { EditProposal, SectionProps } from '@/lib/contracts';

export interface StoredEdit extends EditProposal {
    id: string;
    projectId: string;
    userId: string;
    /** Props as they stood when the proposal was made, for a stale-edit check. */
    preProps: SectionProps;
    consumed: boolean;
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

let counter = 0;
export function nextEditId(): string {
    counter += 1;
    return `edit_${counter}`;
}
