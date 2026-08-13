import { describe, it, expect } from 'vitest';
import { assemble, isBlank, missingSections, AssemblyError } from '@/lib/ai/generate/assemble';
import type { AssembleInput } from '@/lib/ai/generate/assemble';
import { SCHEMA_VERSION } from '@/lib/contracts';
import type { SectionInstance, VerticalProfile } from '@/lib/contracts';

const profile = {
    slug: 'dental-clinic',
    label: 'Dental clinic',
    aliases: [],
    recipe: [
        { type: 'hero', required: true },
        { type: 'services', required: true },
        { type: 'contact', required: true },
    ],
    artDirection: {
        themeId: 'clinical-blue', motionId: 'whisper',
        radiusId: 'soft', spacingId: 'default', imageryId: 'bright-clean',
    },
    vocabulary: { customer: 'patient', purchase: 'appointment' },
    imageQueries: ['clinic'],
} as VerticalProfile;

const section = (id: string, type: string): SectionInstance => ({
    id, type, variant: 'centred', brief: 'x',
    visible: true, locked: false, source: 'ai', props: {},
} as SectionInstance);

const input = (sections: SectionInstance[], props: Map<string, object>): AssembleInput => ({
    vertical: 'dental-clinic',
    profile,
    sections,
    props: props as AssembleInput['props'],
    title: 'Smile Dental',
    description: 'A dental clinic.',
});

describe('assemble', () => {
    it('pairs props to sections by id, not position', () => {
        const sections = [section('s_01', 'hero'), section('s_02', 'services')];
        const props = new Map<string, object>([
            ['s_02', { heading: 'Services' }],
            ['s_01', { heading: 'Welcome' }],
        ]);

        const c = assemble(input(sections, props));
        expect(c.sections[0].props).toEqual({ heading: 'Welcome' });
        expect(c.sections[1].props).toEqual({ heading: 'Services' });
    });

    it('stamps the schema version and art direction', () => {
        const c = assemble(input([section('s_01', 'hero')], new Map([['s_01', { a: 1 }]])));
        expect(c.schemaVersion).toBe(SCHEMA_VERSION);
        expect(c.artDirection.themeId).toBe('clinical-blue');
    });

    it('lets classified tone override the profile theme (FR-047)', () => {
        const c = assemble({
            ...input([section('s_01', 'hero')], new Map([['s_01', { a: 1 }]])),
            tone: 'bold',
        });
        expect(c.artDirection.themeId).toBe('deep-luxury');
        expect(c.artDirection.motionId).toBe('showcase');
        expect(c.artDirection.radiusId).toBe('soft');
    });

    it('throws when a section has no content', () => {
        expect(() => assemble(input([section('s_01', 'hero')], new Map())))
            .toThrow(AssemblyError);
    });

    it('throws on an empty plan', () => {
        expect(() => assemble(input([], new Map()))).toThrow(AssemblyError);
    });

    it('throws on duplicate ids', () => {
        const sections = [section('s_01', 'hero'), section('s_01', 'services')];
        const props = new Map<string, object>([['s_01', { a: 1 }]]);
        expect(() => assemble(input(sections, props))).toThrow(/duplicate/);
    });
});

describe('isBlank / missingSections', () => {
    it('detects an all-empty composition', () => {
        const c = assemble(input([section('s_01', 'hero')], new Map([['s_01', { h: '' }]])));
        expect(isBlank(c)).toBe(true);
    });

    it('lists required sections the plan omitted', () => {
        const c = assemble(input([section('s_01', 'hero')], new Map([['s_01', { h: 'Hi' }]])));
        expect(missingSections(c, profile).sort()).toEqual(['contact', 'services']);
    });
});