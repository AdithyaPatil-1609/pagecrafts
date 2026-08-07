import { SCHEMA_VERSION, MAX_SECTIONS } from '@/lib/contracts';
import type {
    Composition, SectionInstance, SectionProps, VerticalProfile,
} from '@/lib/contracts';

export interface AssembleInput {
    vertical: string;
    profile: VerticalProfile;
    sections: SectionInstance[];
    props: Map<string, SectionProps>;
    title: string;
    description: string;
}

export class AssemblyError extends Error { }

export function assemble(input: AssembleInput): Composition {
    const { sections, props } = input;

    if (sections.length === 0) throw new AssemblyError('assemble: no sections planned.');
    if (sections.length > MAX_SECTIONS) {
        throw new AssemblyError(`assemble: ${sections.length} sections exceeds ${MAX_SECTIONS}.`);
    }

    const filled = sections.map((s) => {
        const p = props.get(s.id);
        if (!p) throw new AssemblyError(`assemble: no content for section ${s.id} (${s.type}).`);
        return { ...s, props: p };
    });

    const ids = new Set(filled.map((s) => s.id));
    if (ids.size !== filled.length) throw new AssemblyError('assemble: duplicate section ids.');

    return {
        schemaVersion: SCHEMA_VERSION,
        vertical: input.vertical,
        artDirection: input.profile.artDirection,
        meta: {
            title: input.title,
            description: input.description,
            lang: 'en',
        },
        sections: filled,
    };
}

export function isBlank(composition: Composition): boolean {
    return composition.sections.every((s) =>
        Object.values(s.props).every((v) => v === '' || v === null || v === undefined));
}

export function missingSections(
    composition: Composition,
    profile: VerticalProfile,
): string[] {
    const present = new Set(composition.sections.map((s) => s.type));
    return profile.recipe
        .filter((r) => r.required && !present.has(r.type))
        .map((r) => r.type);
}