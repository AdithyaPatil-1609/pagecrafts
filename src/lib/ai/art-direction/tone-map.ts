import type { ArtDirection, MotionId, ThemeId, Tone } from '@/lib/contracts';
import { MOTION_IDS, THEME_IDS } from '@/lib/contracts';

/**
 * Classified tone constrains the profile look (FR-047 → FR-041a).
 *
 * The profile picks a look for the vertical. Tone used to *replace* theme and
 * motion with one pair per tone — so `formal` (half the corpus) always became
 * `clinical-blue` / `whisper`. Radius, spacing and imagery already stay with
 * the profile. Theme and motion now stay too when they already fit the tone.
 */
export const TONE_THEMES: Record<Tone, readonly ThemeId[]> = {
    playful: ['vivid-energy', 'sunlit-craft', 'calm-sage'],
    formal: ['clinical-blue', 'mono-precision', 'tech-slate', 'deep-luxury'],
    minimal: ['mono-precision', 'calm-sage', 'tech-slate', 'clinical-blue'],
    bold: ['deep-luxury', 'vivid-energy', 'sunlit-craft'],
    warm: ['warm-editorial', 'sunlit-craft', 'calm-sage'],
};

export const TONE_MOTIONS: Record<Tone, readonly MotionId[]> = {
    playful: ['kinetic', 'showcase'],
    formal: ['whisper', 'calm', 'none'],
    minimal: ['calm', 'whisper', 'none'],
    bold: ['showcase', 'kinetic', 'editorial'],
    warm: ['editorial', 'calm', 'whisper'],
};

function nearest<T extends string>(
    current: T,
    allowed: readonly T[],
    order: readonly T[],
): T {
    if (allowed.includes(current)) return current;
    const from = order.indexOf(current);
    let best = allowed[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const option of allowed) {
        const dist = Math.abs(order.indexOf(option) - from);
        if (dist < bestDist) {
            bestDist = dist;
            best = option;
        }
    }
    return best;
}

export function applyTone(art: ArtDirection, tone?: Tone): ArtDirection {
    if (!tone) return art;
    return {
        ...art,
        themeId: nearest(art.themeId, TONE_THEMES[tone], THEME_IDS),
        motionId: nearest(art.motionId, TONE_MOTIONS[tone], MOTION_IDS),
    };
}
