import { SCHEMA_VERSION, type ArtDirection, type Composition, type SectionInstance } from '@/lib/contracts';
import { artDirection as artDirectionSchema } from '@/lib/contracts/schemas/ai';
import { composition as compositionSchema } from '@/lib/contracts/schemas/ai';

const DEFAULT_ART: ArtDirection = {
    themeId: 'clinical-blue',
    motionId: 'calm',
    radiusId: 'soft',
    spacingId: 'default',
    imageryId: 'bright-clean',
};

export class MigrationError extends Error {}

function asRecord(value: unknown, path: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new MigrationError(`migrate: ${path} is not an object.`);
    }
    return value as Record<string, unknown>;
}

function migrateArt(raw: unknown, legacyTheme: unknown): ArtDirection {
    if (raw && typeof raw === 'object') {
        const parsed = artDirectionSchema.safeParse(raw);
        if (parsed.success) return parsed.data;
    }
    const theme = typeof legacyTheme === 'string' ? legacyTheme : undefined;
    const parsed = artDirectionSchema.safeParse({
        ...DEFAULT_ART,
        ...(theme ? { themeId: theme } : {}),
    });
    return parsed.success ? parsed.data : DEFAULT_ART;
}

function migrateSection(raw: unknown, index: number): SectionInstance {
    const s = asRecord(raw, `sections[${index}]`);
    const id = typeof s.id === 'string' && s.id ? s.id : `s_${String(index + 1).padStart(2, '0')}`;
    const type = typeof s.type === 'string' ? s.type : '';
    const variant = typeof s.variant === 'string' && s.variant ? s.variant : 'centred';
    const brief = typeof s.brief === 'string' ? s.brief : '';
    const source = s.source === 'user' || s.source === 'profile-default' ? s.source : 'ai';
    const props = s.props && typeof s.props === 'object' && !Array.isArray(s.props)
        ? (s.props as SectionInstance['props'])
        : {};

    return {
        id,
        type: type as SectionInstance['type'],
        variant,
        brief,
        visible: s.visible !== false,
        locked: s.locked === true,
        source,
        props,
    };
}

/**
 * Bring a stored composition up to `SCHEMA_VERSION`.
 *
 * Unknown future versions are refused — we cannot guess a format we have not
 * written. Missing or older versions are filled with defaults so a site saved
 * before art-direction dials existed still opens (TC-128, R-NEW-F).
 */
export function migrateComposition(raw: unknown): Composition {
    const obj = asRecord(raw, 'composition');
    const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 0;

    if (version > SCHEMA_VERSION) {
        throw new MigrationError(
            `migrate: schemaVersion ${version} is newer than ${SCHEMA_VERSION}.`,
        );
    }

    if (version === SCHEMA_VERSION) {
        const parsed = compositionSchema.safeParse(obj);
        if (parsed.success) return parsed.data;
        throw new MigrationError(`migrate: schemaVersion ${SCHEMA_VERSION} failed validation.`);
    }

    const sectionsIn = Array.isArray(obj.sections) ? obj.sections : [];
    const draft: Composition = {
        schemaVersion: SCHEMA_VERSION,
        vertical: typeof obj.vertical === 'string' && obj.vertical ? obj.vertical : 'general-business',
        artDirection: migrateArt(obj.artDirection, obj.theme),
        meta: {
            title: typeof (obj.meta as { title?: unknown } | undefined)?.title === 'string'
                ? (obj.meta as { title: string }).title
                : 'Untitled',
            description: typeof (obj.meta as { description?: unknown } | undefined)?.description === 'string'
                ? (obj.meta as { description: string }).description
                : '',
            lang: typeof (obj.meta as { lang?: unknown } | undefined)?.lang === 'string'
                ? (obj.meta as { lang: string }).lang
                : 'en',
        },
        sections: sectionsIn.map(migrateSection),
    };

    const parsed = compositionSchema.safeParse(draft);
    if (!parsed.success) {
        throw new MigrationError(`migrate: could not upgrade schemaVersion ${version}.`);
    }
    return parsed.data;
}
