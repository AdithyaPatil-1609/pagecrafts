import { MAX_SECTIONS, type SectionKey } from '@/lib/contracts';
import { variantsFor } from '../sections/contracts';

export interface PlannedSection {
    type: SectionKey;
    variant: string;
    brief: string;
}

export function normalisePlan(sections: PlannedSection[]): PlannedSection[] {
    const valid = sections.filter((s) => variantsFor(s.type).includes(s.variant));

    const hero = valid.find((s) => s.type === 'hero');
    const footer = valid.find((s) => s.type === 'footer');

    const middle = valid
        .filter((s) => s.type !== 'hero' && s.type !== 'footer')
        .filter((s, i, arr) =>
            i === 0 || !(arr[i - 1].type === s.type && arr[i - 1].variant === s.variant));

    const reserved = (hero ? 1 : 0) + (footer ? 1 : 0);

    const out = [
        ...(hero ? [hero] : []),
        ...middle.slice(0, MAX_SECTIONS - reserved),
        ...(footer ? [footer] : []),
    ];

    for (let i = 1; i < out.length; i += 1) {
        if (out[i].variant !== out[i - 1].variant) continue;
        const alt = variantsFor(out[i].type).find((v) => v !== out[i - 1].variant);
        if (alt) out[i] = { ...out[i], variant: alt };
    }

    return out;
}
