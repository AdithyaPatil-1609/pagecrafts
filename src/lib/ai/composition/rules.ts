import { MAX_SECTIONS, type SectionKey } from '@/lib/contracts';
import { variantsFor } from '../sections/contracts';

export interface PlannedSection {
    type: SectionKey;
    variant: string;
    brief: string;
}

export function normalisePlan(sections: PlannedSection[]): PlannedSection[] {
    let out = sections.filter((s) => variantsFor(s.type).includes(s.variant));

    const heroes = out.filter((s) => s.type === 'hero');
    const footers = out.filter((s) => s.type === 'footer');
    out = out.filter((s) => s.type !== 'hero' && s.type !== 'footer');

    out = out.filter((s, i, arr) =>
        i === 0 || !(arr[i - 1].type === s.type && arr[i - 1].variant === s.variant));

    for (let i = 1; i < out.length; i += 1) {
        if (out[i].variant !== out[i - 1].variant) continue;
        const alt = variantsFor(out[i].type).find((v) => v !== out[i - 1].variant);
        if (alt) out[i] = { ...out[i], variant: alt };
    }

    const reserved = (heroes.length ? 1 : 0) + (footers.length ? 1 : 0);
    out = out.slice(0, MAX_SECTIONS - reserved);

    if (heroes.length) out.unshift(heroes[0]);
    if (footers.length) out.push(footers[0]);

    return out;
}