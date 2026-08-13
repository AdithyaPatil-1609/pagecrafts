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
    it('overrides the profile theme and motion, leaving the other dials', () => {
        const next = applyTone(profile, 'formal');
        expect(next.themeId).toBe('clinical-blue');
        expect(next.motionId).toBe('whisper');
        expect(next.radiusId).toBe('organic');
        expect(next.spacingId).toBe('airy');
        expect(next.imageryId).toBe('warm-natural');
    });

    it('is a no-op when no tone is supplied', () => {
        expect(applyTone(profile)).toEqual(profile);
    });
});
