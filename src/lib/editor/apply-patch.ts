import type { Composition, PatchOp, SectionInstance } from '@/lib/contracts';

/** Only `/props/{key}` is in scope for a scoped edit. Anything else is ignored. */
export function propKeyFromPath(path: string): string | null {
    const match = /^\/props\/([^/]+)$/.exec(path);
    return match ? match[1] : null;
}

export function applyOpsToSection(section: SectionInstance, patch: PatchOp[]): SectionInstance {
    let props = { ...section.props };

    for (const op of patch) {
        const key = propKeyFromPath(op.path);
        if (!key) continue;

        if (op.op === 'remove') {
            const next = { ...props };
            delete next[key];
            props = next;
        } else {
            props = { ...props, [key]: op.value };
        }
    }

    return { ...section, props };
}

export function applyEditPatch(
    composition: Composition,
    targetSectionId: string,
    patch: PatchOp[],
): Composition {
    return {
        ...composition,
        sections: composition.sections.map((section) =>
            section.id === targetSectionId ? applyOpsToSection(section, patch) : section,
        ),
    };
}
