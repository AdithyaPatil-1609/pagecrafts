import type { ArtDirection, MotionId, ThemeId, Tone } from '@/lib/contracts';
import { MOTION_IDS, THEME_IDS } from '@/lib/contracts';
import { TONE_MOTIONS, TONE_THEMES } from '../art-direction/tone-map';

/**
 * R-NEW-C — corpus diversity, enforced at generation time.
 *
 * The D11 grader measured this after the fact on 30 pages and recorded a 48%
 * collapse onto `clinical-blue` / `whisper`. Recording it is not a fix. This
 * module keeps a rolling sample of what recently shipped and, when a new page
 * would push a theme above ~30% or a motion above ~40%, picks a compatible
 * alternative. Tone constraints still hold (`TONE_THEMES` / `TONE_MOTIONS`).
 * The job never fails for looking too much like its neighbours.
 *
 * PRD sample is 50 sites; D11 used 30. The window is 50. Thresholds match the
 * grader so a generation-time repair and a post-run measurement agree.
 */

export const DIVERSITY_WINDOW = 50;
export const THEME_SHARE_MAX = 0.30;
export const MOTION_SHARE_MAX = 0.40;

export interface Look {
    themeId: ThemeId;
    motionId: MotionId;
}

export interface DiversitySampleStore {
    recent(): readonly Look[];
    record(look: Look): void;
    clear(): void;
}

/** In-memory rolling window. Persist later by swapping the store, not the caller. */
export function memoryDiversityStore(window = DIVERSITY_WINDOW): DiversitySampleStore {
    const samples: Look[] = [];
    return {
        recent: () => samples.slice(),
        record(look) {
            samples.push(look);
            if (samples.length > window) samples.splice(0, samples.length - window);
        },
        clear() {
            samples.length = 0;
        },
    };
}

let store: DiversitySampleStore = memoryDiversityStore();

export function diversityStore(): DiversitySampleStore {
    return store;
}

export function setDiversityStore(next: DiversitySampleStore | null): void {
    store = next ?? memoryDiversityStore();
}

export function resetDiversityStore(): void {
    store = memoryDiversityStore();
}

export interface DiverseLook {
    art: ArtDirection;
    themeRepaired: boolean;
    motionRepaired: boolean;
    themeDetail?: string;
    motionDetail?: string;
}

function countOf<T>(ids: readonly T[], id: T): number {
    return ids.filter((x) => x === id).length;
}

/**
 * A single occurrence is not a collapse — 1/1 is always 100%. Repair only when
 * this id is already in the window and adding it would push the share over the
 * cap. That is what D11 measured: clustering, not the first page of a run.
 */
function wouldExceed<T>(
    recent: readonly T[],
    id: T,
    window: number,
    maxShare: number,
): boolean {
    const n = Math.min(recent.length + 1, window);
    const prior = recent.slice(-(n - 1));
    const nextCount = countOf(prior, id) + 1;
    if (nextCount <= 1) return false;
    return nextCount / n > maxShare;
}

function pickAvoiding<T extends string>(
    current: T,
    allowed: readonly T[],
    recent: readonly T[],
    window: number,
    maxShare: number,
): { value: T; repaired: boolean } {
    const options = allowed.length ? allowed : [current];
    if (!wouldExceed(recent, current, window, maxShare)) {
        return { value: current, repaired: false };
    }

    const n = Math.min(recent.length + 1, window);
    const prior = recent.slice(-(n - 1));

    const under = options.filter((id) => !wouldExceed(recent, id, window, maxShare));
    const pool = under.length ? under : options;

    let best = pool[0];
    for (const id of pool) {
        if (countOf(prior, id) < countOf(prior, best)) best = id;
    }

    return { value: best, repaired: best !== current };
}

export function pickDiverseLook(
    art: ArtDirection,
    tone: Tone | undefined,
    recent: readonly Look[],
    window = DIVERSITY_WINDOW,
): DiverseLook {
    const themes = tone ? TONE_THEMES[tone] : THEME_IDS;
    const motions = tone ? TONE_MOTIONS[tone] : MOTION_IDS;

    const themePick = pickAvoiding(
        art.themeId,
        themes,
        recent.map((l) => l.themeId),
        window,
        THEME_SHARE_MAX,
    );
    const motionPick = pickAvoiding(
        art.motionId,
        motions,
        recent.map((l) => l.motionId),
        window,
        MOTION_SHARE_MAX,
    );

    const n = Math.min(recent.length + 1, window);
    const themeShare = (countOf(recent.map((l) => l.themeId).slice(-(n - 1)), art.themeId) + 1) / n;
    const motionShare = (countOf(recent.map((l) => l.motionId).slice(-(n - 1)), art.motionId) + 1) / n;

    return {
        art: {
            ...art,
            themeId: themePick.value,
            motionId: motionPick.value,
        },
        themeRepaired: themePick.repaired,
        motionRepaired: motionPick.repaired,
        themeDetail: themePick.repaired
            ? `theme "${art.themeId}" would be ${(themeShare * 100).toFixed(0)}% of the last ${n} `
                + `(limit ${THEME_SHARE_MAX * 100}%) — switched to "${themePick.value}"`
            : undefined,
        motionDetail: motionPick.repaired
            ? `motion "${art.motionId}" would be ${(motionShare * 100).toFixed(0)}% of the last ${n} `
                + `(limit ${MOTION_SHARE_MAX * 100}%) — switched to "${motionPick.value}"`
            : undefined,
    };
}
