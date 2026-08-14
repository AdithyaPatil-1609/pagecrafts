import { describe, expect, it } from 'vitest';
import { LOOK_DIALS } from '@/lib/editor/look';
import {
    IMAGERY_IDS,
    MOTION_IDS,
    RADIUS_IDS,
    SPACING_IDS,
    THEME_IDS,
} from '@/lib/contracts';

describe('look dials (D9 restyle)', () => {
    it('covers every art-direction field in plain language', () => {
        const keys = LOOK_DIALS.map((dial) => dial.key);
        expect(keys).toEqual(['themeId', 'motionId', 'radiusId', 'spacingId', 'imageryId']);
        expect(LOOK_DIALS.every((dial) => dial.label && !/_/.test(dial.label))).toBe(true);
    });

    it('offers every registered option', () => {
        const byKey = Object.fromEntries(LOOK_DIALS.map((dial) => [dial.key, dial.options.map((o) => o.id)]));
        expect(byKey.themeId).toEqual([...THEME_IDS]);
        expect(byKey.motionId).toEqual([...MOTION_IDS]);
        expect(byKey.radiusId).toEqual([...RADIUS_IDS]);
        expect(byKey.spacingId).toEqual([...SPACING_IDS]);
        expect(byKey.imageryId).toEqual([...IMAGERY_IDS]);
    });
});
