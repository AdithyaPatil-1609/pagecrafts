import type { EditProposal, PatchOp, SectionInstance, SectionProps } from '@/lib/contracts';
import { contractFor } from '../sections/contracts';

export class ApplyError extends Error {}

function setAt(target: Record<string, unknown>, path: string, value: unknown, op: PatchOp['op']): void {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] !== 'props' || parts.length !== 2) {
        throw new ApplyError(`Patch path "${path}" is not a section field.`);
    }
    const key = parts[1];
    if (op === 'remove') {
        delete target[key];
        return;
    }
    target[key] = value;
}

/**
 * Apply a proposal to one section instance. The surrounding composition is
 * untouched — an accepted edit modifies exactly one section (TC-044, v3).
 */
export function applyPatch(section: SectionInstance, patch: readonly PatchOp[]): SectionInstance {
    const props: SectionProps = { ...section.props };
    for (const op of patch) {
        setAt(props, op.path, op.value, op.op);
    }

    const parsed = contractFor(section.type).fill.safeParse(props);
    if (!parsed.success) {
        throw new ApplyError(`Patch failed the ${section.type} content schema.`);
    }

    return { ...section, props: parsed.data as SectionProps, source: 'user' };
}

export function applyProposal(section: SectionInstance, proposal: Pick<EditProposal, 'targetSectionId' | 'patch'>): SectionInstance {
    if (proposal.targetSectionId !== section.id) {
        throw new ApplyError('Patch names a different section.');
    }
    return applyPatch(section, proposal.patch);
}
