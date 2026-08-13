import type { Category, Palette, Template, Tone } from "@/lib/contracts";
import { paletteSchema, toneSchema } from "@/lib/contracts/schemas/ai";
import { categorySchema } from "@/lib/ai/schemas";
import { rankTemplates } from "@/lib/ai/rank";

// Ordering the gallery for what someone described (D5).
//
// Two different things arrive at this screen and they must not be treated alike:
//
//   a category the person PICKED  — an instruction. It filters: they asked for restaurants
//                                   and they get restaurants (see categories.ts).
//   a category we INFERRED        — a guess. It ranks: the best matches lead and the rest
//                                   of the library follows.
//
// Filtering on a guess is how a funnel dies. "A website for my gym" classifies to fitness,
// the library ships one fitness design, and a person who asked to see designs is shown a
// grid of one — with eleven perfectly good designs hidden behind a decision they never
// made. The D5 milestone says ten real templates on the screen, and it says it for this
// reason. So a guess reorders and never removes (D-6).
//
// The score itself is Hanish's rankTemplates: deterministic tag overlap, no embeddings
// (D-5). Same query, same order, every time — which is what lets the ordering be a URL
// someone can share and reload.

export interface IntentQuery {
    /** The classifier's category. Ranks; never filters. */
    category?: Category;
    vertical?: string;
    tone?: Tone;
    palette?: Palette;
}

export interface RankedTemplate extends Template {
    score: number;
}

/**
 * Read the classifier's attributes out of untrusted URL params.
 *
 * Each value is checked against the same frozen enum the classifier is checked against, so
 * a hand-edited or stale URL can only ever produce a weaker ranking — never an error, and
 * never a value that reaches the scorer without belonging to the vocabulary. Returns
 * undefined when nothing usable survives, which means "order the library normally".
 */
export function toIntent(params: {
    intent?: string | null;
    vertical?: string | null;
    tone?: string | null;
    palette?: string | null;
}): IntentQuery | undefined {
    const category = categorySchema.safeParse(params.intent);
    const tone = toneSchema.safeParse(params.tone);
    const palette = paletteSchema.safeParse(params.palette);
    const vertical = params.vertical?.trim().toLowerCase();

    const intent: IntentQuery = {
        ...(category.success ? { category: category.data } : {}),
        ...(vertical && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vertical)
            ? { vertical: vertical.slice(0, 80) }
            : {}),
        ...(tone.success ? { tone: tone.data } : {}),
        ...(palette.success ? { palette: palette.data } : {}),
    };

    return Object.keys(intent).length > 0 ? intent : undefined;
}

/** The same attributes back as URL params, so sorting and paging keep the ranking. */
export function intentParams(intent: IntentQuery | undefined): Record<string, string> {
    if (!intent) return {};

    return {
        ...(intent.category ? { intent: intent.category } : {}),
        ...(intent.vertical ? { vertical: intent.vertical } : {}),
        ...(intent.tone ? { tone: intent.tone } : {}),
        ...(intent.palette ? { palette: intent.palette } : {}),
    };
}

/**
 * The library, best matches first. Every template is returned — a guess reorders, it does
 * not remove.
 *
 * rankTemplates copies each template before scoring, so the registry is never reordered in
 * place (the same rule sortTemplates and filterByCategory follow).
 */
export function rankForIntent(
    templates: Template[],
    intent: IntentQuery,
): RankedTemplate[] {
    return rankTemplates(
        {
            vertical: intent.vertical,
            category: intent.category,
            tone: intent.tone,
            palette: intent.palette,
        },
        templates,
    );
}
