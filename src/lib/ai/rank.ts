import type { Category } from '@/lib/contracts';

export interface RankableTemplate {
    id: string;
    category: Category;
    tags: string[];
    /** Curated vertical slug. Optional so the hand-authored library can rank without it. */
    vertical?: string;
}

export interface RankAttributes {
    vertical?: string;
    category?: Category;
    tone?: string;
    palette?: string;
    sections?: string[];
}

/**
 * Vertical at 100 is the structural floor for TC-118: the maximum without a
 * vertical match is category 30 + palette 10 + tone 10 + ~7 section tags = 57.
 */
const WEIGHT = {
    vertical: 100,
    category: 30,
    palette: 10,
    tone: 10,
    section: 1,
} as const;

export function scoreTemplate(attrs: RankAttributes, tpl: RankableTemplate): number {
    let score = 0;
    if (
        attrs.vertical
        && (attrs.vertical === tpl.vertical || tpl.tags.includes(attrs.vertical))
    ) score += WEIGHT.vertical;
    if (attrs.category && attrs.category === tpl.category) score += WEIGHT.category;
    if (attrs.palette && tpl.tags.includes(attrs.palette)) score += WEIGHT.palette;
    if (attrs.tone && tpl.tags.includes(attrs.tone)) score += WEIGHT.tone;
    for (const s of attrs.sections ?? []) {
        if (tpl.tags.includes(`has-${s}`)) score += WEIGHT.section;
    }
    return score;
}

export function rankTemplates<T extends RankableTemplate>(
    attrs: RankAttributes,
    templates: readonly T[],
): Array<T & { score: number }> {
    return templates
        .map((t) => ({ ...t, score: scoreTemplate(attrs, t) }))
        .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
}
