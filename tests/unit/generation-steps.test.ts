import { describe, expect, it } from 'vitest';

import {
    editSuggestionSteps,
    generationSteps,
    generationThought,
    writingLabel,
} from '@/lib/editor/generation-steps';

describe('generationSteps', () => {
    it('starts on reading the brief', () => {
        const steps = generationSteps({
            status: 'queued',
            sectionsDone: 0,
            sectionsTotal: 0,
        });
        expect(steps).toEqual([
            { id: 'brief', label: 'Reading the brief', state: 'active' },
        ]);
        expect(generationThought({ status: 'queued', sectionsDone: 0, sectionsTotal: 0 }))
            .toBe('Starting from your brief.');
    });

    it('names real pages from the plan, not invented toolchain steps', () => {
        const steps = generationSteps({
            status: 'streaming',
            sectionsDone: 1,
            sectionsTotal: 3,
            plannedSections: ['hero', 'contact', 'footer'],
        });
        expect(steps.map((step) => step.label)).toEqual([
            'Reading the brief',
            'Writing the home page',
            'Writing contact',
            'Writing the footer',
            'Putting the files together',
            'Three looks are ready',
        ]);
        expect(steps.find((step) => step.id === 'section-0')?.state).toBe('done');
        expect(steps.find((step) => step.id === 'section-1')?.state).toBe('active');
        expect(steps.find((step) => step.id === 'section-2')?.state).toBe('pending');
        expect(JSON.stringify(steps)).not.toMatch(/webpack|JSON|HTTP|database|payload|exception/i);
    });

    it('marks assembling while validating, then three looks when done', () => {
        expect(generationSteps({
            status: 'validating',
            sectionsDone: 3,
            sectionsTotal: 3,
            plannedSections: ['hero', 'about', 'contact'],
        }).find((step) => step.id === 'assemble')).toMatchObject({ state: 'active' });

        const done = generationSteps({
            status: 'done',
            sectionsDone: 3,
            sectionsTotal: 3,
            plannedSections: ['hero', 'about', 'contact'],
            variantCount: 3,
        });
        expect(done.find((step) => step.id === 'looks')).toMatchObject({
            label: 'Three looks are ready',
            state: 'done',
        });
        expect(generationThought({
            status: 'done',
            sectionsDone: 3,
            sectionsTotal: 3,
            variantCount: 3,
        })).toBe('Three looks are ready.');
    });

    it('writes hero as the home page', () => {
        expect(writingLabel('hero')).toBe('Writing the home page');
        expect(writingLabel('contact')).toBe('Writing contact');
    });
});

describe('editSuggestionSteps', () => {
    it('tracks drafting a change while Ask is busy', () => {
        expect(editSuggestionSteps(true)).toEqual([
            { id: 'read', label: 'Reading your request', state: 'done' },
            { id: 'draft', label: 'Drafting a change', state: 'active' },
        ]);
    });
});
