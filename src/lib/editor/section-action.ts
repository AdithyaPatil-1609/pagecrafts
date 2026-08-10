import type { ArtDirection, Composition, SectionInstance } from '@/lib/contracts';

function mapSection(
    composition: Composition,
    sectionId: string,
    change: (section: SectionInstance) => SectionInstance,
): Composition {
    return {
        ...composition,
        sections: composition.sections.map((s) => (s.id === sectionId ? change(s) : s)),
    };
}

export function reorderSection(
    composition: Composition,
    sectionId: string,
    direction: 'up' | 'down',
): Composition {
    const sections = [...composition.sections];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return composition;

    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= sections.length) return composition;

    [sections[index], sections[swapWith]] = [sections[swapWith], sections[index]];
    return { ...composition, sections };
}

export function toggleVisible(composition: Composition, sectionId: string): Composition {
    return mapSection(composition, sectionId, (s) => ({ ...s, visible: !s.visible }));
}

export function toggleLocked(composition: Composition, sectionId: string): Composition {
    return mapSection(composition, sectionId, (s) => ({ ...s, locked: !s.locked }));
}

export function changeVariant(
    composition: Composition,
    sectionId: string,
    variant: string,
): Composition {
    return mapSection(composition, sectionId, (s) => ({ ...s, variant, source: 'user' }));
}

export function restyle(composition: Composition, artDirection: Partial<ArtDirection>): Composition {
    return { ...composition, artDirection: { ...composition.artDirection, ...artDirection } };
}