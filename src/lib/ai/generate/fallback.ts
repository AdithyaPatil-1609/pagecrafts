import { rankTemplates, type RankableTemplate, type RankAttributes } from '../rank';

export interface TemplateFallback<T extends RankableTemplate> {
    template: T;
    score: number;
    /** Why generation was abandoned, for the SSE `fallback` event. */
    reason: string;
}

/**
 * Last line of defence, after the provider chain is exhausted (A3 §5.1):
 * the user still leaves with a site.
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
