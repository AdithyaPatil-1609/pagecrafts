import { describe, expect, it } from 'vitest';
import {
    changeVariant, reorderSection, restyle, toggleLocked, toggleVisible,
} from '@/lib/editor/section-action';
import type { Composition } from '@/lib/contracts';

function sampleComposition(): Composition {
    return {
        schemaVersion: 3,
        vertical: 'consultant',
        artDirection: {
            themeId: 'clinical-blue',
            motionId: 'calm',
            radiusId: 'soft',
            spacingId: 'default',
            imageryId: 'bright-clean',
        },
        meta: { title: 'Test', description: 'Test', lang: 'en' },
        sections: [
            { id: 's1', type: 'hero', variant: 'centered', brief: '', visible: true, locked: false, source: 'ai', props: {} },
            { id: 's2', type: 'services', variant: 'grid', brief: '', visible: true, locked: false, source: 'ai', props: {} },
        ],
    };
}

describe('reorderSection', () => {
    it('does nothing when moving the first section up', () => {
        const c = sampleComposition();
        const result = reorderSection(c, 's1', 'up');
        expect(result.sections.map((s) => s.id)).toEqual(['s1', 's2']);
    });

    it('does nothing when moving the last section down', () => {
        const c = sampleComposition();
        const result = reorderSection(c, 's2', 'down');
        expect(result.sections.map((s) => s.id)).toEqual(['s1', 's2']);
    });

    it('swaps two sections', () => {
        const c = sampleComposition();
        const result = reorderSection(c, 's2', 'up');
        expect(result.sections.map((s) => s.id)).toEqual(['s2', 's1']);
    });
});

describe('toggleVisible / toggleLocked', () => {
    it('only changes the targeted section', () => {
        const c = sampleComposition();
        const result = toggleVisible(c, 's1');

        expect(result.sections[0].visible).toBe(false);
        expect(result.sections[1].visible).toBe(true);
    });

    it('flips locked independently of visible', () => {
        const c = sampleComposition();
        const result = toggleLocked(c, 's1');

        expect(result.sections[0].locked).toBe(true);
        expect(result.sections[0].visible).toBe(true);
    });
});

describe('changeVariant', () => {
    it('updates the variant and marks the source as user', () => {
        const c = sampleComposition();
        const result = changeVariant(c, 's1', 'split');

        expect(result.sections[0].variant).toBe('split');
        expect(result.sections[0].source).toBe('user');
    });
});

describe('restyle', () => {
    it('merges a partial art direction', () => {
        const c = sampleComposition();
        const result = restyle(c, { motionId: 'kinetic' });

        expect(result.artDirection.motionId).toBe('kinetic');
        expect(result.artDirection.themeId).toBe('clinical-blue');
    });
});