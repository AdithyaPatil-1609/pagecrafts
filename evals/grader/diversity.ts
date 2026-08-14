import type { Composition } from '@/lib/contracts';
import { variantSignature } from './index';
import { THEME_SHARE_MAX, MOTION_SHARE_MAX } from '@/lib/ai/composition/diversity';

export { THEME_SHARE_MAX, MOTION_SHARE_MAX };

/**
 * R-NEW-C (scored 16, High): every business gets the same look.
 *
 * Not detectable by reading one output — only across the corpus. A page can be
 * individually excellent and still be the thirtieth identical page, so this
 * metric outranks the pass rate when it fails: a good pass rate conceals the
 * problem rather than contradicting it.
 */
export interface Diversity {
    themes: Map<string, number>;
    motions: Map<string, number>;
    /** Distinct section+variant sequences. Equal to 1 means every page is laid out identically. */
    variantSets: number;
    dominantTheme: string | null;
    dominantMotion: string | null;
    dominantThemeShare: number;
    dominantMotionShare: number;
    passes: boolean;
    /** What failed, in words, for the baseline write-up. */
    notes: string[];
}

/**
 * Looser than the 15% / 25% proposed for the curated catalogue in the template
 * amendment, because thirty generations is a much smaller sample and a strict
 * threshold would fire on ordinary clustering.
 */

export interface DiversityRow {
    id: string;
    themeId: string;
    motionId: string;
    variantSignature: string;
}

export function rowFor(id: string, composition: Composition): DiversityRow {
    return {
        id,
        themeId: composition.artDirection.themeId,
        motionId: composition.artDirection.motionId,
        variantSignature: variantSignature(composition),
    };
}

function tally(values: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function dominant(counts: Map<string, number>, total: number): [string | null, number] {
    const top = [...counts.entries()][0];
    if (!top || total === 0) return [null, 0];
    return [top[0], top[1] / total];
}

export function measureDiversity(rows: DiversityRow[]): Diversity {
    const total = rows.length;
    const themes = tally(rows.map((r) => r.themeId));
    const motions = tally(rows.map((r) => r.motionId));

    const [dominantTheme, dominantThemeShare] = dominant(themes, total);
    const [dominantMotion, dominantMotionShare] = dominant(motions, total);
    const variantSets = new Set(rows.map((r) => r.variantSignature)).size;

    const notes: string[] = [];
    if (total === 0) {
        notes.push('no generations to measure — diversity is unproven, not passing');
    }
    if (dominantThemeShare > THEME_SHARE_MAX) {
        notes.push(
            `theme "${dominantTheme}" is ${(dominantThemeShare * 100).toFixed(0)}% of the corpus `
            + `(limit ${THEME_SHARE_MAX * 100}%)`,
        );
    }
    if (dominantMotionShare > MOTION_SHARE_MAX) {
        notes.push(
            `motion "${dominantMotion}" is ${(dominantMotionShare * 100).toFixed(0)}% of the corpus `
            + `(limit ${MOTION_SHARE_MAX * 100}%)`,
        );
    }
    if (total > 1 && variantSets === 1) {
        notes.push('every page uses an identical section/variant sequence');
    }
    if (dominantThemeShare === 1 && total > 1) {
        notes.push(
            'HEADLINE: art direction collapsed to a single theme — this outranks the pass rate',
        );
    }

    return {
        themes,
        motions,
        variantSets,
        dominantTheme,
        dominantMotion,
        dominantThemeShare,
        dominantMotionShare,
        passes: total > 0
            && dominantThemeShare <= THEME_SHARE_MAX
            && dominantMotionShare <= MOTION_SHARE_MAX,
        notes,
    };
}
