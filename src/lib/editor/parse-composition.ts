import {
    IMAGERY_IDS,
    MOTION_IDS,
    RADIUS_IDS,
    SECTION_KEYS,
    SPACING_IDS,
    THEME_IDS,
    type ArtDirection,
    type Composition,
    type ImageryId,
    type MotionId,
    type RadiusId,
    type SectionInstance,
    type SectionKey,
    type SpacingId,
    type ThemeId,
} from '@/lib/contracts';

const SECTION_SET = new Set<string>(SECTION_KEYS);
const THEME_SET = new Set<string>(THEME_IDS);
const MOTION_SET = new Set<string>(MOTION_IDS);
const RADIUS_SET = new Set<string>(RADIUS_IDS);
const SPACING_SET = new Set<string>(SPACING_IDS);
const IMAGERY_SET = new Set<string>(IMAGERY_IDS);

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function pick<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T {
    return typeof value === 'string' && allowed.has(value) ? (value as T) : fallback;
}

function parseArt(value: unknown): ArtDirection | null {
    const rec = asRecord(value);
    if (!rec) return null;
    return {
        themeId: pick<ThemeId>(rec.themeId, THEME_SET, 'clinical-blue'),
        motionId: pick<MotionId>(rec.motionId, MOTION_SET, 'calm'),
        radiusId: pick<RadiusId>(rec.radiusId, RADIUS_SET, 'soft'),
        spacingId: pick<SpacingId>(rec.spacingId, SPACING_SET, 'default'),
        imageryId: pick<ImageryId>(rec.imageryId, IMAGERY_SET, 'bright-clean'),
    };
}

function parseSection(value: unknown): SectionInstance | null {
    const rec = asRecord(value);
    if (!rec) return null;
    if (typeof rec.id !== 'string' || !rec.id) return null;
    if (typeof rec.type !== 'string' || !SECTION_SET.has(rec.type)) return null;

    const props = asRecord(rec.props) ?? {};

    return {
        id: rec.id,
        type: rec.type as SectionKey,
        variant: typeof rec.variant === 'string' && rec.variant ? rec.variant : 'default',
        brief: typeof rec.brief === 'string' ? rec.brief : '',
        visible: rec.visible !== false,
        locked: rec.locked === true,
        source: rec.source === 'user' || rec.source === 'profile-default' ? rec.source : 'ai',
        props,
    };
}

export function parseComposition(raw: string | null | undefined): Composition | null {
    if (!raw?.trim()) return null;

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }

    const rec = asRecord(data);
    if (!rec || !Array.isArray(rec.sections)) return null;

    const artDirection = parseArt(rec.artDirection);
    if (!artDirection) return null;

    const metaRec = asRecord(rec.meta) ?? {};
    const sections = rec.sections
        .map(parseSection)
        .filter((section): section is SectionInstance => section !== null);

    return {
        schemaVersion: typeof rec.schemaVersion === 'number' ? rec.schemaVersion : 3,
        vertical: typeof rec.vertical === 'string' ? rec.vertical : '',
        artDirection,
        meta: {
            title: typeof metaRec.title === 'string' ? metaRec.title : 'Untitled',
            description: typeof metaRec.description === 'string' ? metaRec.description : '',
            lang: typeof metaRec.lang === 'string' && metaRec.lang ? metaRec.lang : 'en',
        },
        sections,
    };
}
