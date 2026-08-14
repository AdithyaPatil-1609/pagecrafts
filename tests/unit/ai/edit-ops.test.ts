import { describe, it, expect, afterEach } from 'vitest';
import { editShare, recordEditOp, setEditOpStore, memoryEditOpStore } from '@/lib/ai/cost/edit-ops';

afterEach(() => {
    setEditOpStore(null);
});

describe('edit-op counter — D17', () => {
    it('treats composition PATCH ops as zero-request and propose as provider', () => {
        const store = memoryEditOpStore();
        setEditOpStore(store);
        recordEditOp('zero-request', 'reorder');
        recordEditOp('zero-request', 'restyle');
        recordEditOp('provider', 'propose');

        const share = editShare();
        expect(share.total).toBe(3);
        expect(share.zeroRequest).toBe(2);
        expect(share.share).toBeCloseTo(2 / 3);
    });
});
