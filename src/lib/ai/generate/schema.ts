import { contractFor } from '../sections/contracts';
import type { Composition, ContentSchema, SectionInstance } from '@/lib/contracts';

/**
 * The content-panel key for a section. Unique types keep their name (`about`,
 * `contact`) so slots read as `about.heading`. A repeated type is disambiguated
 * with the instance id so two galleries cannot overwrite each other.
 */
export function sectionContentKey(
    section: Pick<SectionInstance, 'id' | 'type'>,
    all: readonly Pick<SectionInstance, 'type'>[],
): string {
    const count = all.filter((s) => s.type === section.type).length;
    return count > 1 ? `${section.type}-${section.id}` : section.type;
}

/** The schema the editor panel is drawn from, matching the slots in the generated HTML. */
export function schemaFromComposition(composition: Composition): ContentSchema {
    const visible = composition.sections.filter((s) => s.visible);
    return {
        sections: visible.map((section) => {
            const contract = contractFor(section.type);
            return {
                key: sectionContentKey(section, visible),
                label: contract.label,
                fields: contract.fields,
            };
        }),
    };
}

/**
 * Structured copy taken from the composition itself, not re-parsed from markup.
 * Image fields stay unset: content_json stores asset ids, and generation only
 * has a search query.
 */
export function contentFromComposition(composition: Composition): Record<string, unknown> {
    const visible = composition.sections.filter((s) => s.visible);
    const content: Record<string, unknown> = {};

    for (const section of visible) {
        const key = sectionContentKey(section, visible);
        const fields = contractFor(section.type).fields;
        const slice: Record<string, unknown> = {};

        for (const field of fields) {
            if (field.type === 'image' || field.type === 'backgroundImage') continue;
            const value = section.props[field.key];
            if (value === undefined) continue;
            slice[field.key] = value;
        }

        content[key] = slice;
    }

    return content;
}
