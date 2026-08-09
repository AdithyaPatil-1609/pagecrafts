import { rankTemplates, type RankableTemplate, type RankAttributes } from '../rank';

export interface TemplateFallback<T extends RankableTemplate> {
    template: T;
    score: number;
    /** Why generation was abandoned, for the SSE `fallback` event and the record. */
    reason: string;
}

/**
 * The last line of defence: when generation cannot produce a site, the user still
 * leaves with one.
 *
 * This is now third in line, not first — a provider outage advances the chain
 * before it is considered (A3 §5.1), so reaching here means generation itself
 * failed, not that one vendor was busy.
 */
export function nearestTemplate<T extends RankableTemplate>(
    attrs: RankAttributes,
    templates: readonly T[],
    reason: string,
): TemplateFallback<T> | undefined {
    if (templates.length === 0) return undefined;
    const [best] = rankTemplates(attrs, templates);
    return { template: best, score: best.score, reason };
}
