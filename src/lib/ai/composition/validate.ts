import {
    MOTION_IDS, type Composition, type MotionId, type SectionInstance, type Tone,
} from '@/lib/contracts';
import { motionTokens, type MotionToken } from '@/lib/render/motion-tokens';
import { variantsFor } from '../sections/contracts';
import { TONE_MOTIONS } from '../art-direction/tone-map';
import {
    diversityStore, pickDiverseLook, type DiversitySampleStore, type Look,
} from './diversity';

/**
 * D16 — motion budget and diversity, checked on one composition.
 *
 * The D11 grader answers these questions across a corpus, after the fact. That
 * is the right place to find a systemic problem and the wrong place to stop: by
 * the time a corpus run notices, the page has already been built and shown to
 * someone. These are the same questions asked of a single composition, at
 * generation time, where they can still be repaired.
 *
 * Per-page: motion budget, variant monotony/repeat, motion-mismatch.
 * Corpus: theme/motion share against a rolling sample (R-NEW-C). Reparable
 * findings are repaired; the job never fails because a page looked too familiar.
 */

export type FindingRule =
    | 'motion-budget'
    | 'variant-monotony'
    | 'variant-repeat'
    | 'motion-mismatch'
    | 'theme-share'
    | 'motion-share';

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

export interface ValidateOptions {
    tokens?: Record<MotionId, MotionToken>;
    /** Recent shipped (theme, motion) pairs. Omit to skip corpus enforcement. */
    recent?: readonly Look[];
    /** Classified tone — alternatives stay inside `TONE_THEMES` / `TONE_MOTIONS`. */
    tone?: Tone;
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
 *
 * When `allowed` is set (a tone constraint), prefer those ids; fall back to the
 * full registry if none of them fit, because a budget miss is worse than a
 * slightly-off tone.
 */
function fitMotion(
    motion: MotionId,
    sections: number,
    tokens: Record<MotionId, MotionToken>,
    allowed?: readonly MotionId[],
): { motion: MotionId; from: MotionId; spanMs: number } | undefined {
    const span = motionSpanMs(tokens[motion], sections);
    if (span <= MOTION_BUDGET_MS) return undefined;

    const rank = (ids: readonly MotionId[]) => ids
        .map((id) => ({ id, spanMs: motionSpanMs(tokens[id], sections) }))
        .filter((c) => c.spanMs <= MOTION_BUDGET_MS)
        .sort((a, b) => b.spanMs - a.spanMs);

    const affordable = rank(allowed && allowed.length ? allowed : MOTION_IDS);
    const fallback = affordable.length ? affordable : rank(MOTION_IDS);

    const best = fallback[0];
    if (!best || best.id === motion) return undefined;

    return { motion: best.id, from: motion, spanMs: best.spanMs };
}

// ── diversity, within one page ─────────────────────────────────────────────

function isMiddle(s: SectionInstance): boolean {
    return s.type !== 'hero' && s.type !== 'footer';
}

function altVariant(section: SectionInstance, avoid: ReadonlySet<string>): string | undefined {
    if (section.locked) return undefined;
    return variantsFor(section.type).find((v) => v !== section.variant && !avoid.has(v))
        ?? variantsFor(section.type).find((v) => v !== section.variant);
}

/**
 * A page whose middle sections all use the same variant reads as machine
 * assembled however good the copy is. `normalisePlan` already breaks up
 * *adjacent* repeats; this catches the case where they are not adjacent but
 * every one of them is the same — and now actually changes the variant when
 * another one is registered for that type.
 */
function repairVariants(sections: SectionInstance[]): {
    sections: SectionInstance[];
    findings: CompositionFinding[];
} {
    const findings: CompositionFinding[] = [];
    const next = sections.map((s) => ({ ...s }));
    const originalMiddle = sections.filter(isMiddle);
    const originalOnly = originalMiddle.length >= 3
        && new Set(originalMiddle.map((s) => s.variant)).size === 1
        ? originalMiddle[0].variant
        : undefined;

    for (let i = 1; i < next.length; i += 1) {
        if (!isMiddle(next[i]) || !isMiddle(next[i - 1])) continue;
        if (next[i].variant !== next[i - 1].variant) continue;
        const repeated = next[i].variant;
        const left = next[i - 1].type;
        const right = next[i].type;
        const alt = altVariant(next[i], new Set([repeated]));
        if (alt) {
            next[i] = { ...next[i], variant: alt };
            findings.push({
                rule: 'variant-repeat',
                severity: 'repaired',
                detail: `${left} and ${right} both used "${repeated}" — ${right} stepped to "${alt}"`,
            });
        } else {
            findings.push({
                rule: 'variant-repeat',
                severity: 'warn',
                detail: `${left} and ${right} both use "${repeated}"`,
            });
        }
    }

    if (originalOnly) {
        const distinct = new Set(next.filter(isMiddle).map((s) => s.variant));
        if (distinct.size === 1) {
            for (let i = 0; i < next.length; i += 1) {
                if (!isMiddle(next[i]) || next[i].variant !== originalOnly) continue;
                const alt = altVariant(next[i], distinct);
                if (!alt) continue;
                next[i] = { ...next[i], variant: alt };
                distinct.add(alt);
                if (distinct.size >= 2) break;
            }
        }
        const diversified = new Set(next.filter(isMiddle).map((s) => s.variant)).size > 1;
        findings.push({
            rule: 'variant-monotony',
            severity: diversified ? 'repaired' : 'warn',
            detail: diversified
                ? `all ${originalMiddle.length} middle sections used "${originalOnly}" — diversified`
                : `all ${originalMiddle.length} middle sections use "${originalOnly}"`,
        });
    }

    return { sections: next, findings };
}

/**
 * Art direction that contradicts itself. `none` motion with a `showcase`-scale
 * page is not wrong, but a theme picked to feel energetic paired with no motion
 * at all usually means one of the two was defaulted rather than chosen.
 */
const ENERGETIC_THEMES = new Set(['vivid-energy', 'deep-luxury']);

function repairMotionMismatch(
    composition: Composition,
    sections: number,
    tokens: Record<MotionId, MotionToken>,
    tone?: Tone,
): { motionId: MotionId; finding: CompositionFinding } | undefined {
    const { themeId, motionId } = composition.artDirection;
    if (!ENERGETIC_THEMES.has(themeId) || motionId !== 'none') return undefined;

    const allowed = tone ? TONE_MOTIONS[tone] : MOTION_IDS;
    const candidates = (allowed.includes('none') ? allowed.filter((m) => m !== 'none') : allowed)
        .filter((m) => motionSpanMs(tokens[m], sections) <= MOTION_BUDGET_MS);

    const pick = candidates[0];
    if (!pick) {
        return {
            motionId,
            finding: {
                rule: 'motion-mismatch',
                severity: 'warn',
                detail: `theme "${themeId}" with motion "none" — one of the two was probably defaulted`,
            },
        };
    }

    return {
        motionId: pick,
        finding: {
            rule: 'motion-mismatch',
            severity: 'repaired',
            detail: `theme "${themeId}" with motion "none" — stepped to "${pick}"`,
        },
    };
}

// ── the validator ──────────────────────────────────────────────────────────

export function validateComposition(
    composition: Composition,
    options: ValidateOptions | Record<MotionId, MotionToken> = {},
): ValidatedComposition {
    // Older tests passed tokens as the second argument.
    const opts: ValidateOptions = isTokenMap(options) ? { tokens: options } : options;
    const tokens = opts.tokens ?? motionTokens();
    const findings: CompositionFinding[] = [];

    let next = composition;

    if (opts.recent) {
        const diverse = pickDiverseLook(next.artDirection, opts.tone, opts.recent);
        if (diverse.themeRepaired && diverse.themeDetail) {
            findings.push({ rule: 'theme-share', severity: 'repaired', detail: diverse.themeDetail });
        }
        if (diverse.motionRepaired && diverse.motionDetail) {
            findings.push({ rule: 'motion-share', severity: 'repaired', detail: diverse.motionDetail });
        }
        if (diverse.themeRepaired || diverse.motionRepaired) {
            next = { ...next, artDirection: diverse.art };
        }
    }

    const variants = repairVariants(next.sections);
    findings.push(...variants.findings);
    if (variants.sections.some((s, i) => s.variant !== next.sections[i]?.variant)) {
        next = { ...next, sections: variants.sections };
    }

    const sections = animatedCount(next.sections);
    const allowedMotions = opts.tone ? TONE_MOTIONS[opts.tone] : undefined;
    const fitted = fitMotion(next.artDirection.motionId, sections, tokens, allowedMotions);

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
            ...next,
            artDirection: { ...next.artDirection, motionId: fitted.motion },
        };
    }

    const mismatch = repairMotionMismatch(next, sections, tokens, opts.tone);
    if (mismatch) {
        findings.push(mismatch.finding);
        if (mismatch.finding.severity === 'repaired') {
            next = {
                ...next,
                artDirection: { ...next.artDirection, motionId: mismatch.motionId },
            };
        }
    }

    return {
        composition: next,
        findings,
        repaired: findings.some((f) => f.severity === 'repaired'),
    };
}

function isTokenMap(
    value: ValidateOptions | Record<MotionId, MotionToken>,
): value is Record<MotionId, MotionToken> {
    return MOTION_IDS.some((id) => id in value && typeof (value as Record<string, unknown>)[id] === 'object');
}

/**
 * Validate, then record the look that actually shipped so the next page sees it.
 *
 * The store is a seam: in-memory by default, swappable for a persisted window
 * without changing the job runner.
 */
export function checkAndRecord(
    composition: Composition,
    opts: ValidateOptions & { store?: DiversitySampleStore } = {},
): ValidatedComposition {
    const samples = opts.store ?? diversityStore();
    const result = validateComposition(composition, {
        ...opts,
        recent: opts.recent ?? samples.recent(),
    });
    samples.record({
        themeId: result.composition.artDirection.themeId,
        motionId: result.composition.artDirection.motionId,
    });
    return result;
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
