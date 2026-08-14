import { describe, expect, it } from 'vitest';
import { applyOps, invertOps, type CompositionOp } from '@/lib/ai/composition/patch';
import { SCHEMA_VERSION, type Composition, type SectionInstance } from '@/lib/contracts';

const section = (id: string, type: SectionInstance['type'], variant = 'centred'): SectionInstance => ({
    id, type, variant, brief: '', visible: true, locked: false, source: 'ai', props: {},
});

function sample(): Composition {
    return {
        schemaVersion: SCHEMA_VERSION,
        vertical: 'consultant',
        artDirection: {
            themeId: 'clinical-blue', motionId: 'calm', radiusId: 'soft',
            spacingId: 'default', imageryId: 'bright-clean',
        },
        meta: { title: 'Test', description: 'Test', lang: 'en' },
        sections: [section('s1', 'hero'), section('s2', 'services', 'cards')],
    };
}

describe('composition patch apply / invert (TC-129)', () => {
    it('reorders, hides, changes variant and restyles', () => {
        const next = applyOps(sample(), [
            { op: 'reorder', sectionId: 's2', direction: 'up' },
            { op: 'hide', sectionId: 's1' },
            { op: 'variant', sectionId: 's2', variant: 'grid' },
            { op: 'restyle', artDirection: { motionId: 'kinetic' } },
        ]);
        expect(next.sections.map((s) => s.id)).toEqual(['s2', 's1']);
        expect(next.sections[1].visible).toBe(false);
        expect(next.sections[0].variant).toBe('grid');
        expect(next.artDirection.motionId).toBe('kinetic');
        expect(next.artDirection.themeId).toBe('clinical-blue');
    });

    it('adds and removes a section', () => {
        const added = applyOps(sample(), [{
            op: 'add',
            afterId: 's1',
            section: section('s3', 'about', 'text'),
        }]);
        expect(added.sections.map((s) => s.id)).toEqual(['s1', 's3', 's2']);

        const removed = applyOps(added, [{ op: 'remove', sectionId: 's3' }]);
        expect(removed.sections.map((s) => s.id)).toEqual(['s1', 's2']);
    });

    it('invert(ops) restores the original for every op kind', () => {
        const before = sample();
        const ops: CompositionOp[] = [
            { op: 'reorder', sectionId: 's2', direction: 'up' },
            { op: 'hide', sectionId: 's1' },
            { op: 'variant', sectionId: 's2', variant: 'grid' },
            { op: 'restyle', artDirection: { themeId: 'deep-luxury' } },
            { op: 'add', section: section('s3', 'about', 'text') },
        ];
        const after = applyOps(before, ops);
        const undone = applyOps(after, invertOps(before, ops));
        expect(undone).toEqual(before);
    });
});
