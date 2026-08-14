import { describe, expect, it } from 'vitest';
import { applyEditPatch, propKeyFromPath } from '@/lib/editor/apply-patch';
import type { Composition } from '@/lib/contracts';

function sample(): Composition {
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
            {
                id: 's1', type: 'hero', variant: 'centred', brief: '',
                visible: true, locked: false, source: 'ai',
                props: { heading: 'Old heading' },
            },
            {
                id: 's2', type: 'services', variant: 'cards', brief: '',
                visible: true, locked: false, source: 'ai',
                props: { heading: 'Services' },
            },
        ],
    };
}

describe('applyEditPatch', () => {
    it('reads a props path', () => {
        expect(propKeyFromPath('/props/heading')).toBe('heading');
        expect(propKeyFromPath('/sections/0/props/heading')).toBeNull();
    });

    it('replaces only the targeted section prop', () => {
        const next = applyEditPatch(sample(), 's1', [
            { op: 'replace', path: '/props/heading', value: 'New heading' },
        ]);

        expect(next.sections[0].props.heading).toBe('New heading');
        expect(next.sections[1].props.heading).toBe('Services');
    });

    it('adds a missing prop and ignores unknown paths', () => {
        const next = applyEditPatch(sample(), 's1', [
            { op: 'add', path: '/props/sub', value: 'Welcome' },
            { op: 'replace', path: '/meta/title', value: 'nope' },
        ]);

        expect(next.sections[0].props.sub).toBe('Welcome');
        expect(next.meta.title).toBe('Test');
    });
});
