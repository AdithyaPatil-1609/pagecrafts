import { describe, expect, it } from 'vitest';
import { applyTone } from '@/lib/ai/art-direction';
import type { ArtDirection } from '@/lib/contracts';

const profile: ArtDirection = {
    themeId: 'sunlit-craft',
    motionId: 'editorial',
    radiusId: 'organic',
    spacingId: 'airy',
    imageryId: 'warm-natural',
};

describe('applyTone (FR-047)', () => {
    it('keeps a profile theme that already fits the tone', () => {
        const next = applyTone({
            ...profile,
            themeId: 'tech-slate',
            motionId: 'calm',
        }, 'formal');
        expect(next.themeId).toBe('tech-slate');
        expect(next.motionId).toBe('calm');
        expect(next.radiusId).toBe('organic');
        expect(next.spacingId).toBe('airy');
        expect(next.imageryId).toBe('warm-natural');
    });

    it('remaps an incompatible theme to the nearest tone-fit, not a single pin', () => {
        const next = applyTone(profile, 'formal');
        expect(['clinical-blue', 'mono-precision', 'tech-slate', 'deep-luxury'])
            .toContain(next.themeId);
        expect(next.themeId).not.toBe('sunlit-craft');
        expect(next.radiusId).toBe('organic');
    });

    it('does not pin every formal page to clinical-blue', () => {
        const looks = (['tech-slate', 'clinical-blue', 'mono-precision'] as const)
            .map((themeId) => applyTone({ ...profile, themeId }, 'formal').themeId);
        expect(new Set(looks).size).toBe(3);
    });

    it('is a no-op when no tone is supplied', () => {
        expect(applyTone(profile)).toEqual(profile);
    });
});
