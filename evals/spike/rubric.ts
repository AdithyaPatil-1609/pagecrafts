import { isBlank, missingSections } from '@/lib/ai/generate/assemble';
import type { SpikeResult } from './pipeline';

export interface AutoScore {
    structureValid: boolean;
    requiredSectionsPresent: boolean;
    nonBlank: boolean;
    missing: string[];
}

export interface HumanScore {
    copySensible: 1 | 2 | 3 | 4 | 5 | null;
    sectionSelectionAppropriate: 1 | 2 | 3 | 4 | 5 | null;
    artDirectionAppropriate: 1 | 2 | 3 | 4 | 5 | null;
    notes: string;
}

export interface Score extends AutoScore {
    vertical: string;
    hasTemplate: boolean;
    human: HumanScore;
}

export function autoScore(r: SpikeResult, requiredFromProfile: string[] = []): AutoScore {
    if (!r.ok || !r.composition) {
        return {
            structureValid: false,
            requiredSectionsPresent: false,
            nonBlank: false,
            missing: requiredFromProfile,
        };
    }

    const missing = missingSections(r.composition, {
        recipe: requiredFromProfile.map((type) => ({ type, required: true })),
    } as never);

    return {
        structureValid: true,
        requiredSectionsPresent: missing.length === 0,
        nonBlank: r.mode === 'plan-only' ? true : !isBlank(r.composition),
        missing,
    };
}

export function blankScoresheet(results: SpikeResult[]): Score[] {
    return results.map((r) => ({
        vertical: r.vertical,
        hasTemplate: r.hasTemplate,
        ...autoScore(r),
        human: {
            copySensible: null,
            sectionSelectionAppropriate: null,
            artDirectionAppropriate: null,
            notes: '',
        },
    }));
}

export function passRate(scores: Score[]): { auto: number; human: number | null } {
    const auto = scores.filter((s) =>
        s.structureValid && s.requiredSectionsPresent && s.nonBlank).length / scores.length;

    const judged = scores.filter((s) => s.human.copySensible !== null);
    const human = judged.length === 0
        ? null
        : judged.filter((s) => (s.human.copySensible ?? 0) >= 4).length / judged.length;

    return { auto, human };
}