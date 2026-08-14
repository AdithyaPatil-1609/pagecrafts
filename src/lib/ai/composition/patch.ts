import {
    MAX_SECTIONS,
    type ArtDirection, type Composition, type SectionInstance,
} from '@/lib/contracts';
import { variantsFor } from '../sections/contracts';
import { reorderSection, restyle, toggleVisible } from '@/lib/editor/section-action';

export type CompositionOp =
    | { op: 'reorder'; sectionId: string; direction: 'up' | 'down' }
    | { op: 'hide'; sectionId: string }
    | { op: 'show'; sectionId: string }
    | { op: 'remove'; sectionId: string }
    | { op: 'add'; section: SectionInstance; afterId?: string }
    | { op: 'variant'; sectionId: string; variant: string; source?: SectionInstance['source'] }
    | { op: 'restyle'; artDirection: Partial<ArtDirection> };

export class PatchError extends Error {}

function findIndex(composition: Composition, sectionId: string): number {
    const index = composition.sections.findIndex((s) => s.id === sectionId);
    if (index === -1) throw new PatchError(`No section "${sectionId}".`);
    return index;
}

function setVisible(composition: Composition, sectionId: string, visible: boolean): Composition {
    const current = composition.sections[findIndex(composition, sectionId)];
    if (current.visible === visible) return composition;
    return toggleVisible(composition, sectionId);
}

function addSection(
    composition: Composition,
    section: SectionInstance,
    afterId?: string,
): Composition {
    if (composition.sections.length >= MAX_SECTIONS) {
        throw new PatchError(`A page cannot have more than ${MAX_SECTIONS} sections.`);
    }
    if (composition.sections.some((s) => s.id === section.id)) {
        throw new PatchError(`Section "${section.id}" is already on the page.`);
    }
    const allowed = variantsFor(section.type);
    if (!allowed.includes(section.variant)) {
        throw new PatchError(`"${section.variant}" is not a registered variant of ${section.type}.`);
    }

    const sections = [...composition.sections];
    const insertAt = afterId
        ? findIndex(composition, afterId) + 1
        : sections.length;
    sections.splice(insertAt, 0, section);
    return { ...composition, sections };
}

function removeSection(composition: Composition, sectionId: string): Composition {
    const index = findIndex(composition, sectionId);
    const target = composition.sections[index];
    if (target.locked) throw new PatchError(`Section "${sectionId}" is locked.`);
    if (composition.sections.length <= 1) {
        throw new PatchError('A page needs at least one section.');
    }
    return {
        ...composition,
        sections: composition.sections.filter((s) => s.id !== sectionId),
    };
}

export function applyOp(composition: Composition, op: CompositionOp): Composition {
    switch (op.op) {
        case 'reorder': return reorderSection(composition, op.sectionId, op.direction);
        case 'hide': return setVisible(composition, op.sectionId, false);
        case 'show': return setVisible(composition, op.sectionId, true);
        case 'remove': return removeSection(composition, op.sectionId);
        case 'add': return addSection(composition, op.section, op.afterId);
        case 'variant': {
            findIndex(composition, op.sectionId);
            return {
                ...composition,
                sections: composition.sections.map((s) =>
                    s.id === op.sectionId
                        ? { ...s, variant: op.variant, source: op.source ?? 'user' }
                        : s),
            };
        }
        case 'restyle': return restyle(composition, op.artDirection);
    }
}

export function applyOps(composition: Composition, ops: readonly CompositionOp[]): Composition {
    return ops.reduce(applyOp, composition);
}

function inverseOf(before: Composition, op: CompositionOp): CompositionOp {
    switch (op.op) {
        case 'reorder':
            return { op: 'reorder', sectionId: op.sectionId, direction: op.direction === 'up' ? 'down' : 'up' };
        case 'hide':
            return { op: 'show', sectionId: op.sectionId };
        case 'show':
            return { op: 'hide', sectionId: op.sectionId };
        case 'remove': {
            const index = findIndex(before, op.sectionId);
            const afterId = index > 0 ? before.sections[index - 1].id : undefined;
            return { op: 'add', section: before.sections[index], afterId };
        }
        case 'add':
            return { op: 'remove', sectionId: op.section.id };
        case 'variant': {
            const current = before.sections[findIndex(before, op.sectionId)];
            return {
                op: 'variant',
                sectionId: op.sectionId,
                variant: current.variant,
                source: current.source,
            };
        }
        case 'restyle': {
            const previous = Object.fromEntries(
                (Object.keys(op.artDirection) as Array<keyof ArtDirection>)
                    .map((key) => [key, before.artDirection[key]]),
            ) as Partial<ArtDirection>;
            return { op: 'restyle', artDirection: previous };
        }
    }
}

/** Invert a batch so applying the result to the post-state restores `before`. */
export function invertOps(before: Composition, ops: readonly CompositionOp[]): CompositionOp[] {
    const inverses: CompositionOp[] = [];
    let cursor = before;
    for (const op of ops) {
        inverses.push(inverseOf(cursor, op));
        cursor = applyOp(cursor, op);
    }
    return inverses.reverse();
}
