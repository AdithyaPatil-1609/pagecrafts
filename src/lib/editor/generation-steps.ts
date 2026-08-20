import type { JobStatus } from '@/lib/ai/jobs/types';

export type LiveJobStatus = JobStatus | 'loading';
export type StepState = 'pending' | 'active' | 'done';

export interface GenerationStep {
    id: string;
    label: string;
    state: StepState;
}

export interface GenerationStepInput {
    status: LiveJobStatus;
    sectionsDone: number;
    sectionsTotal: number;
    filesReady?: boolean;
    plannedSections?: readonly string[];
    variantCount?: number;
}

/** Plain-language page names for the live-creation log. Hero is the home page. */
const PAGE_NAME: Record<string, string> = {
    hero: 'the home page',
    about: 'about',
    services: 'services',
    menu: 'the menu',
    gallery: 'the gallery',
    team: 'the team',
    testimonials: 'stories',
    faq: 'questions',
    contact: 'contact',
    footer: 'the footer',
};

export function writingLabel(sectionType: string): string {
    return `Writing ${PAGE_NAME[sectionType] ?? 'a page'}`;
}

/**
 * Vertical checklist tied to real job fields. Steps appear only when the job
 * has named them — never a fake inspect/build log.
 */
export function generationSteps(input: GenerationStepInput): GenerationStep[] {
    const { status, sectionsDone, sectionsTotal, plannedSections = [], variantCount = 0 } = input;
    const planned = plannedSections.length > 0
        ? [...plannedSections]
        : Array.from({ length: Math.max(sectionsTotal, 0) }, () => '');
    const pastBrief = status !== 'loading' && status !== 'queued' && status !== 'planning';
    const assembling = status === 'validating' || status === 'done';
    const failed = status === 'failed';

    const steps: GenerationStep[] = [
        {
            id: 'brief',
            label: 'Reading the brief',
            state: failed && !pastBrief
                ? 'active'
                : pastBrief
                    ? 'done'
                    : 'active',
        },
    ];

    for (const [index, type] of planned.entries()) {
        const label = type ? writingLabel(type) : 'Writing a page';
        let state: StepState = 'pending';
        if (failed && sectionsDone <= index) {
            state = sectionsDone === index ? 'active' : 'pending';
        } else if (assembling || sectionsDone > index) {
            state = 'done';
        } else if ((status === 'streaming' || status === 'repairing') && sectionsDone === index) {
            state = 'active';
        }
        steps.push({ id: `section-${index}`, label, state });
    }

    if (pastBrief) {
        steps.push({
            id: 'assemble',
            label: 'Putting the files together',
            state: status === 'done'
                ? 'done'
                : status === 'validating'
                    ? 'active'
                    : 'pending',
        });
    }

    if (pastBrief || variantCount > 0) {
        const looksReady = variantCount >= 3 || (status === 'done' && variantCount > 0);
        steps.push({
            id: 'looks',
            label: looksReady || variantCount >= 3
                ? 'Three looks are ready'
                : status === 'done'
                    ? 'Your site is ready'
                    : 'Three looks are ready',
            state: status === 'done' ? 'done' : 'pending',
        });
    }

    return steps;
}

/** Short status line from real job state — never invented toolchain chatter. */
export function generationThought(input: GenerationStepInput): string {
    const { status, sectionsDone, plannedSections = [] } = input;
    const current = plannedSections[sectionsDone];

    switch (status) {
        case 'loading':
        case 'queued':
            return 'Starting from your brief.';
        case 'planning':
            return 'Figuring out which pages you need.';
        case 'streaming':
            return current ? `${writingLabel(current)}.` : 'Writing the pages.';
        case 'repairing':
            return 'Improving a section so it reads better.';
        case 'validating':
            return 'Putting the files together.';
        case 'done':
            return input.variantCount && input.variantCount >= 3
                ? 'Three looks are ready.'
                : 'Your site is ready.';
        case 'failed':
            return 'Generation did not finish.';
        default:
            return 'Building your website.';
    }
}

/** In-editor Ask: two real states, not a fake toolchain log. */
export function editSuggestionSteps(busy: boolean): GenerationStep[] {
    return [
        { id: 'read', label: 'Reading your request', state: 'done' },
        { id: 'draft', label: 'Drafting a change', state: busy ? 'active' : 'done' },
    ];
}
