import type { ArtDirection, Tone } from '@/lib/contracts';

/**
 * Classified tone overrides the profile default (FR-047 → FR-041a).
 *
 * The profile picks a look for the vertical; the person's tone is a deliberate
 * instruction on top of that. Radius, spacing and imagery stay with the
 * profile — tone speaks through theme and motion.
 */
const TONE_OVERRIDE: Record<Tone, Pick<ArtDirection, 'themeId' | 'motionId'>> = {
    playful: { themeId: 'vivid-energy', motionId: 'kinetic' },
    formal: { themeId: 'clinical-blue', motionId: 'whisper' },
    minimal: { themeId: 'mono-precision', motionId: 'calm' },
    bold: { themeId: 'deep-luxury', motionId: 'showcase' },
    warm: { themeId: 'warm-editorial', motionId: 'editorial' },
};

export function applyTone(art: ArtDirection, tone?: Tone): ArtDirection {
    if (!tone) return art;
    return { ...art, ...TONE_OVERRIDE[tone] };
}
