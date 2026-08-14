/**
 * D17 — which edit operations spent a provider request.
 *
 * Reorder, show/hide, restyle, variant, add/remove (composition PATCH) never
 * call the gateway. `POST /edits` does. The dashboard's zero-request share is
 * that split, not a guess from the ledger: a zero-request edit never writes a
 * generation row, so it cannot be inferred from spend.
 */

export type EditOpKind = 'zero-request' | 'provider';

export interface EditOpRecord {
    kind: EditOpKind;
    op: string;
    at: string;
}

export interface EditShare {
    total: number;
    zeroRequest: number;
    provider: number;
    /** `null` when nothing has been recorded — not the same as 0%. */
    share: number | null;
}

export interface EditOpStore {
    record(kind: EditOpKind, op: string): void;
    all(): readonly EditOpRecord[];
    clear(): void;
}

export function memoryEditOpStore(): EditOpStore {
    const rows: EditOpRecord[] = [];
    return {
        record(kind, op) {
            rows.push({ kind, op, at: new Date().toISOString() });
        },
        all: () => rows.slice(),
        clear() {
            rows.length = 0;
        },
    };
}

let store: EditOpStore = memoryEditOpStore();

export function editOpStore(): EditOpStore {
    return store;
}

export function setEditOpStore(next: EditOpStore | null): void {
    store = next ?? memoryEditOpStore();
}

export function recordEditOp(kind: EditOpKind, op: string): void {
    try {
        store.record(kind, op);
    } catch {
        // A dashboard counter must not fail an edit.
    }
}

export function editShare(records: readonly EditOpRecord[] = store.all()): EditShare {
    const total = records.length;
    const zeroRequest = records.filter((r) => r.kind === 'zero-request').length;
    return {
        total,
        zeroRequest,
        provider: total - zeroRequest,
        share: total === 0 ? null : zeroRequest / total,
    };
}
