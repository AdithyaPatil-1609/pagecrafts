import { MOTION_IDS, type Composition, type MotionId, type SectionInstance } from '@/lib/contracts';
import { motionTokens, type MotionToken } from '@/lib/render/motion-tokens';

/**
 * D16 — motion budget and diversity, checked on one composition.
 *
 * The D11 grader answers these questions across a corpus, after the fact. That
 * is the right place to find a systemic problem and the wrong place to stop: by
 * the time a corpus run notices, the page has already been built and shown to
 * someone. These are the same questions asked of a single composition, at
 * generation time, where they can still be repaired.
 */

export type FindingRule =
    | 'motion-budget'
    | 'variant-monotony'
    | 'variant-repeat'
    | 'motion-mismatch';

export interface CompositionFinding {
    rule: FindingRule;
    /** `repaired` means the composition was changed; `warn` means it was only noted. */
    severity: 'repaired' | 'warn';
    detail: string;
}

export interface ValidatedComposition {
    composition: Composition;
    findings: CompositionFinding[];
    repaired: boolean;
}

/**
 * How long after the page settles the last section is still waiting to animate.
 *
 * Sections animate on scroll with a per-index stagger, so the cost of motion
 * grows with section count, not just with the motion setting. Seven sections at
 * `showcase` (100ms stagger, 900ms duration) leaves the last one finishing 1.5s
 * after it enters view — on a page the visitor is already reading.
 */
export function motionSpanMs(motion: MotionToken, sections: number): number {
    if (sections <= 0) return 0;
    return (sections - 1) * motion.staggerMs + motion.durationMs;
}

/**
 * The ceiling a single page's motion may not exceed.
 *
 * 2,000ms is the point at which the stagger stops reading as choreography and
 * starts reading as the page being slow — it is roughly the threshold above
 * which people report a page "loading" rather than "animating".
 */
export const MOTION_BUDGET_MS = 2_000;

/** The animated sections. A hidden section costs nothing. */
const animatedCount = (sections: SectionInstance[]): number =>
    sections.filter((s) => s.visible).length;

/**
 * Replaces the motion with the most expressive one that still fits the budget.
 *
 * Deliberately not a fixed "calmest first" ladder. Aesthetic calm and motion
 * cost are different orderings, and the stylesheet proves it: `kinetic` spans
 * less than `calm` at seven sections, because it is fast (400ms) despite a
 * wider stagger. Worse, the ordering *changes with section count* — `calm`
 * overtakes `kinetic` on a long page as stagger comes to dominate duration. Any
 * hand-written ladder is therefore wrong at some page length.
 *
 * So: compute every option's span at this page's actual length, keep those that
 * fit, and take the largest. That guarantees the budget and retains as much of
 * the chosen character as the page can afford.
 */
function fitMotion(
    motion: MotionId,
    sections: number,
    tokens: Record<MotionId, MotionToken>,
): { motion: MotionId; from: MotionId; spanMs: number } | undefined {
    const span = motionSpanMs(tokens[motion], sections);
    if (span <= MOTION_BUDGET_MS) return undefined;

    const affordable = MOTION_IDS
        .map((id) => ({ id, spanMs: motionSpanMs(tokens[id], sections) }))
        .filter((c) => c.spanMs <= MOTION_BUDGET_MS)
        .sort((a, b) => b.spanMs - a.spanMs);

    // `none` is 1ms and always fits, so this cannot be empty in practice.
    const best = affordable[0];
    if (!best || best.id === motion) return undefined;

    return { motion: best.id, from: motion, spanMs: best.spanMs };
}

// ── diversity, within one page ─────────────────────────────────────────────

/**
 * A page whose middle sections all use the same variant reads as machine
 * assembled however good the copy is. `normalisePlan` already breaks up
 * *adjacent* repeats; this catches the case where they are not adjacent but
 * every one of them is the same.
 */
function variantFindings(sections: SectionInstance[]): CompositionFinding[] {
    const middle = sections.filter((s) => s.type !== 'hero' && s.type !== 'footer');
    if (middle.length < 3) return [];

    const findings: CompositionFinding[] = [];
    const distinct = new Set(middle.map((s) => s.variant));

    if (distinct.size === 1) {
        findings.push({
            rule: 'variant-monotony',
            severity: 'warn',
            detail: `all ${middle.length} middle sections use "${[...distinct][0]}"`,
        });
    }

    for (let i = 1; i < middle.length; i += 1) {
        if (middle[i].variant === middle[i - 1].variant) {
            findings.push({
                rule: 'variant-repeat',
                severity: 'warn',
                detail: `${middle[i - 1].type} and ${middle[i].type} both use "${middle[i].variant}"`,
            });
        }
    }

    return findings;
}

/**
 * Art direction that contradicts itself. `none` motion with a `showcase`-scale
 * page is not wrong, but a theme picked to feel energetic paired with no motion
 * at all usually means one of the two was defaulted rather than chosen.
 */
const ENERGETIC_THEMES = new Set(['vivid-energy', 'deep-luxury']);

function motionMismatch(composition: Composition): CompositionFinding[] {
    const { themeId, motionId } = composition.artDirection;
    if (ENERGETIC_THEMES.has(themeId) && motionId === 'none') {
        return [{
            rule: 'motion-mismatch',
            severity: 'warn',
            detail: `theme "${themeId}" with motion "none" — one of the two was probably defaulted`,
        }];
    }
    return [];
}

// ── the validator ──────────────────────────────────────────────────────────

export function validateComposition(
    composition: Composition,
    tokens: Record<MotionId, MotionToken> = motionTokens(),
): ValidatedComposition {
    const findings: CompositionFinding[] = [
        ...variantFindings(composition.sections),
        ...motionMismatch(composition),
    ];

    const sections = animatedCount(composition.sections);
    const fitted = fitMotion(composition.artDirection.motionId, sections, tokens);

    let next = composition;

    if (fitted) {
        const before = motionSpanMs(tokens[fitted.from], sections);
        findings.push({
            rule: 'motion-budget',
            severity: 'repaired',
            detail: `${sections} sections at "${fitted.from}" span ${before}ms `
                + `(budget ${MOTION_BUDGET_MS}ms) — stepped down to "${fitted.motion}" `
                + `at ${fitted.spanMs}ms`,
        });
        next = {
            ...composition,
            artDirection: { ...composition.artDirection, motionId: fitted.motion },
        };
    }

    return {
        composition: next,
        findings,
        repaired: findings.some((f) => f.severity === 'repaired'),
    };
}

/**
 * The registered motions ranked by what they actually cost on a page of `n`
 * animated sections, cheapest first. Derived, never declared — the ranking is
 * genuinely different at different page lengths.
 */
export function motionsByCost(
    sections: number,
    tokens: Record<MotionId, MotionToken> = motionTokens(),
): MotionId[] {
    return [...MOTION_IDS].sort(
        (a, b) => motionSpanMs(tokens[a], sections) - motionSpanMs(tokens[b], sections),
    );
}
