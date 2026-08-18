import { describe, expect, it } from 'vitest';
import { generationExplanation, generationProgressCopy, compositionFromJob } from '@/lib/editor/generate-site';
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

describe('compositionFromJob', () => {
    const done = {
        status: 'done' as const,
        sections_done: 4,
        sections_total: 4,
        elapsed_ms: 10,
        files_ready: true,
        composition,
    };

    it('returns the generated composition', () => {
        expect(compositionFromJob(done).composition?.meta.title).toBe('Iron Hall');
        expect(compositionFromJob(done).error).toBeNull();
    });

    it('does not treat a gallery template as a generated site', () => {
        const result = compositionFromJob({
            ...done,
            composition: undefined,
            files_ready: false,
            fallback_template_id: 'portfolio',
        });
        expect(result.composition).toBeNull();
        expect(result.error).toMatch(/could not be generated/i);
        expect(result.error).not.toMatch(/template/i);
    });
});
