import { MAX_SECTIONS, SECTION_KEYS, type SectionKey } from '@/lib/contracts';
import { variantsFor } from '../sections/contracts';

/** A section as the model proposed it — `type` may be anything until validated here. */
export interface PlannedSection {
    type: string;
    variant: string;
    brief: string;
}

/** A section after normalisation — `type` is guaranteed to be a registered key. */
export interface NormalisedSection {
    type: SectionKey;
    variant: string;
    brief: string;
}

export interface NormalisedPlan {
    sections: NormalisedSection[];
    repairs: string[];
}

const KNOWN_TYPES = new Set<string>(SECTION_KEYS);
const isSectionKey = (t: string): t is SectionKey => KNOWN_TYPES.has(t);

export function normalisePlan(sections: PlannedSection[]): NormalisedPlan {
    const repairs: string[] = [];

    const valid: NormalisedSection[] = [];
    for (const s of sections) {
        // Unknown section type — drop it and report, rather than fail the plan.
        if (!isSectionKey(s.type)) {
            repairs.push(`dropped unknown section type "${s.type}"`);
            continue;
        }
        const allowed = variantsFor(s.type);
        if (allowed.includes(s.variant)) {
            valid.push({ type: s.type, variant: s.variant, brief: s.brief });
        } else {
            repairs.push(`${s.type}: "${s.variant}" not registered — used "${allowed[0]}"`);
            valid.push({ type: s.type, variant: allowed[0], brief: s.brief });
        }
    }

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

    return { sections: out, repairs };
}
