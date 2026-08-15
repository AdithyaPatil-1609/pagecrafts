import {
    IMAGERY_IDS,
    MOTION_IDS,
    RADIUS_IDS,
    SPACING_IDS,
    THEME_IDS,
    type ArtDirection,
} from '@/lib/contracts';
import { THEMES } from '@/lib/render/art-direction';

function titled(id: string): string {
    return id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export type LookDial = {
    key: keyof ArtDirection;
    label: string;
    options: { id: string; label: string }[];
};

/** D9 restyle — the five look dials, in words a reader can pick from. */
export const LOOK_DIALS: LookDial[] = [
    {
        key: 'themeId',
        label: 'Colours',
        options: THEME_IDS.map((id) => ({ id, label: THEMES[id].label })),
    },
    {
        key: 'motionId',
        label: 'Motion',
        options: MOTION_IDS.map((id) => ({ id, label: titled(id) })),
    },
    {
        key: 'radiusId',
        label: 'Corners',
        options: RADIUS_IDS.map((id) => ({ id, label: titled(id) })),
    },
    {
        key: 'spacingId',
        label: 'Spacing',
        options: SPACING_IDS.map((id) => ({ id, label: titled(id) })),
    },
    {
        key: 'imageryId',
        label: 'Photos',
        options: IMAGERY_IDS.map((id) => ({ id, label: titled(id) })),
    },
];
