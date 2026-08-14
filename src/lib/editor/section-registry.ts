import { SECTION_KEYS, type SectionKey } from '@/lib/contracts';
import { contractFor, variantsFor } from '@/lib/ai/sections/contracts';

/** D3 skeleton, D4 the rest — every section type the editor can render. */
export const EDITOR_SECTION_TYPES: readonly SectionKey[] = SECTION_KEYS;

export function isSectionKey(value: string): value is SectionKey {
    return (SECTION_KEYS as readonly string[]).includes(value);
}

export function sectionLabel(type: SectionKey): string {
    return contractFor(type).label;
}

export function sectionVariants(type: SectionKey): string[] {
    return variantsFor(type);
}

/** Accepts the British contract spelling and the American alias used in older fixtures. */
export function hasVariant(type: SectionKey, variant: string): boolean {
    const known = variantsFor(type);
    if (known.includes(variant)) return true;
    if (variant === 'centered') return known.includes('centred');
    if (variant === 'centred') return known.includes('centered');
    return false;
}
