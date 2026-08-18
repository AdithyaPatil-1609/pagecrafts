import { describe, expect, it } from 'vitest';
import { generationExplanation, generationProgressCopy } from '@/lib/editor/generate-site';
import type { Composition } from '@/lib/contracts';

const composition: Composition = {
    schemaVersion: 3,
    vertical: 'gym',
    artDirection: {
        themeId: 'vivid-energy',
        motionId: 'kinetic',
        radiusId: 'sharp',
        spacingId: 'tight',
        imageryId: 'bold-contrast',
    },
    meta: { title: 'Iron Hall', description: 'Training', lang: 'en' },
    sections: [
        {
            id: 's1', type: 'hero', variant: 'centred', brief: '',
            visible: true, locked: false, source: 'ai', props: { heading: 'Train' },
        },
        {
            id: 's2', type: 'contact', variant: 'simple', brief: '',
            visible: true, locked: false, source: 'ai', props: { heading: 'Visit' },
        },
    ],
};

describe('generation copy', () => {
    it('names the pages without job jargon', () => {
        const text = generationExplanation(composition, true);
        expect(text).toContain('Iron Hall');
        expect(text).toContain('hero');
        expect(text).toContain('Keep it');
        expect(text).not.toMatch(/job|pipeline|llm|prompt/i);
    });

    it('reports writing progress in plain language', () => {
        expect(generationProgressCopy({
            status: 'streaming',
            sections_done: 2,
            sections_total: 6,
            elapsed_ms: 10,
            files_ready: false,
        })).toBe('Writing the site… 2 of 6');
    });
});
