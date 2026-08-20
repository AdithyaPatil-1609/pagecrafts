import type { TemplateSummary } from "@/lib/templates/query";
import type { TemplateTier } from "@/lib/contracts";

/** Signed-in Welcome uses 8; Build uses the first 12. Landing hero must not repeat those. */
export const HOME_LIBRARY_FACE = 12;
export const LANDING_HERO_FRAMES = 5;
export const LANDING_SHOWCASE_FRAMES = 4;

const TIER_ORDER: readonly TemplateTier[] = ["free", "premium", "signature"];

/** Five designs spread through the library after the home-page face. Stable, not shuffled. */
export function pickLandingHeroTemplates(items: readonly TemplateSummary[]): TemplateSummary[] {
    const rest = items.slice(HOME_LIBRARY_FACE);
    const pool = rest.length >= LANDING_HERO_FRAMES ? rest : items;
    if (pool.length === 0) return [];
    if (pool.length <= LANDING_HERO_FRAMES) return [...pool];

    const last = pool.length - 1;
    const step = last / (LANDING_HERO_FRAMES - 1);
    const picked: TemplateSummary[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < LANDING_HERO_FRAMES; i += 1) {
        const template = pool[Math.round(i * step)]!;
        if (seen.has(template.id)) continue;
        seen.add(template.id);
        picked.push(template);
    }

    for (const template of pool) {
        if (picked.length >= LANDING_HERO_FRAMES) break;
        if (seen.has(template.id)) continue;
        seen.add(template.id);
        picked.push(template);
    }

    return picked;
}

/**
 * Four library designs for the landing showcase: after the signed-in home face,
 * not the hero frames, and one of each price that the library actually has.
 */
export function pickLandingShowcaseTemplates(
    items: readonly TemplateSummary[],
): TemplateSummary[] {
    const hero = new Set(pickLandingHeroTemplates(items).map((item) => item.id));
    const pool = items.slice(HOME_LIBRARY_FACE).filter((item) => !hero.has(item.id));
    const fallback = pool.length > 0 ? pool : items.filter((item) => !hero.has(item.id));
    if (fallback.length === 0) return [];

    const picked: TemplateSummary[] = [];
    const seen = new Set<string>();

    for (const tier of TIER_ORDER) {
        if (picked.length >= LANDING_SHOWCASE_FRAMES) break;
        const hit = fallback.find((item) => item.tier === tier && !seen.has(item.id));
        if (!hit) continue;
        seen.add(hit.id);
        picked.push(hit);
    }

    for (const template of fallback) {
        if (picked.length >= LANDING_SHOWCASE_FRAMES) break;
        if (seen.has(template.id)) continue;
        seen.add(template.id);
        picked.push(template);
    }

    return picked;
}
