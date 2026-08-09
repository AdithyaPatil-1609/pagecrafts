import {
    SECTION_KEYS, THEME_IDS, MOTION_IDS, RADIUS_IDS, SPACING_IDS, IMAGERY_IDS,
    TONE_IDS, PALETTE_IDS,
} from '@/lib/contracts';
import { CATEGORY_LIST } from '../schemas';
import { variantMenu } from '../sections/contracts';

/**
 * Every allowed-value list a prompt may name, generated from its registry.
 * `render()` merges these, so a template can add a `{{...}}` without breaking
 * callers and no list is hand-copied into a prompt.
 */
export function registryVars(): Record<string, string> {
    return {
        categories: CATEGORY_LIST,
        tones: TONE_IDS.join(', '),
        palettes: PALETTE_IDS.join(', '),
        sectionKeys: SECTION_KEYS.join(', '),
        themes: THEME_IDS.join(', '),
        motions: MOTION_IDS.join(', '),
        radii: RADIUS_IDS.join(', '),
        spacings: SPACING_IDS.join(', '),
        imagery: IMAGERY_IDS.join(', '),
        variantMenu: variantMenu(),
    };
}
