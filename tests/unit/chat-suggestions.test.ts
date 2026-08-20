import { describe, expect, it } from 'vitest';
import { chatSuggestions } from '@/lib/editor/chat-suggestions';
import type { Composition } from '@/lib/contracts';

function sample(types: Array<Composition['sections'][number]['type']>): Composition {
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
        sections: types.map((type, index) => ({
            id: `s${index}`,
            type,
            variant: 'centred',
            brief: '',
            visible: true,
            locked: false,
            source: 'ai',
            props: { heading: type },
        })),
    };
}

describe('chat suggestions', () => {
    it('offers copy changes when a forked design is already on the page', () => {
        const items = chatSuggestions({ composition: null, hasPage: true });
        expect(items.map((item) => item.label)).toContain('Rewrite the headline');
        expect(items.map((item) => item.label)).not.toContain('Create a sweet shop website');
    });

    it('offers starters when the page is still empty', () => {
        const items = chatSuggestions({ composition: null });
        expect(items.map((item) => item.label)).toContain('Create a sweet shop website');
        expect(items.some((item) => item.compose)).toBe(true);
    });

    it('offers follow-ups from what is on the page', () => {
        const items = chatSuggestions({
            composition: sample(['hero', 'services', 'contact']),
            lastUserText: 'Make it warmer',
        });
        expect(items.map((item) => item.label)).toEqual(
            expect.arrayContaining([
                'Make the hero more graphical',
                'Use a slide-through layout',
                'Keep going with my last instruction',
                'Make the list of offerings richer',
            ]),
        );
        expect(items.find((item) => item.id === 'keep-going')?.send).toBe('Make it warmer');
    });
});
