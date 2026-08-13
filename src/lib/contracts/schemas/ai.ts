import { z } from 'zod';
import type { Category } from '@/lib/contracts';
import {
    SECTION_KEYS, THEME_IDS, MOTION_IDS, RADIUS_IDS,
    SPACING_IDS, IMAGERY_IDS, MAX_SECTIONS, TONE_IDS, PALETTE_IDS, CATEGORY_IDS,
    SCHEMA_VERSION,
} from '@/lib/contracts';

// Derived from the single list in template.ts rather than restated. A restated
// enum is how this validator ended up seventeen buckets behind the type, quietly
// coercing 21 of 38 categories to "other" (see CATEGORY_IDS).
export const categorySchema = z.enum(CATEGORY_IDS) satisfies z.ZodType<Category>;

export const toneSchema = z.enum(TONE_IDS);
export const paletteSchema = z.enum(PALETTE_IDS);
export const sectionKeySchema = z.enum(SECTION_KEYS);

export const slug = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);

export const classification = z.object({
    category: categorySchema.catch('other'),
    vertical: slug.catch('general-business'),
    tone: toneSchema.catch('minimal'),
    palette: paletteSchema.catch('light'),
    sections: z.array(sectionKeySchema).catch([]),
});

export function coercedFields(raw: Record<string, unknown>): string[] {
    const checks: Array<[string, z.ZodTypeAny]> = [
        ['category', categorySchema],
        ['tone', toneSchema],
        ['palette', paletteSchema],
        ['vertical', slug],
    ];

    return checks
        .filter(([key, schema]) => !schema.safeParse(raw[key]).success)
        .map(([key]) => key);
}

const CLASSIFICATION_KEYS = [
    'category', 'vertical', 'tone', 'palette', 'sections',
] as const;

export function isClassificationShaped(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        CLASSIFICATION_KEYS.every((k) => k in value)
    );
}

// An invented id degrades the art direction rather than sinking the profile.
export const artDirection = z.object({
    themeId: z.enum(THEME_IDS).catch(THEME_IDS[0]),
    motionId: z.enum(MOTION_IDS).catch(MOTION_IDS[0]),
    radiusId: z.enum(RADIUS_IDS).catch(RADIUS_IDS[0]),
    spacingId: z.enum(SPACING_IDS).catch(SPACING_IDS[0]),
    imageryId: z.enum(IMAGERY_IDS).catch(IMAGERY_IDS[0]),
});

export const verticalProfile = z.object({
    label: z.string().min(1).max(60),
    aliases: z.array(z.string().min(1)).max(8),
    recipe: z.array(z.object({
        type: sectionKeySchema,
        required: z.boolean(),
        note: z.string().max(160).optional(),
    })).min(3).max(12),
    artDirection,
    vocabulary: z.object({ customer: z.string().min(1), purchase: z.string().min(1) }),
    imageQueries: z.array(z.string().min(1)).min(1).max(5),
});

// `type` is lenient so an unknown section reaches normalisePlan to be dropped
// rather than failing the whole plan. Legality is enforced there.
export const plannedSection = z.object({
    type: z.string().min(1),
    variant: z.string().min(1),
    brief: z.string().min(1).max(300),
});

export const generationPlan = z.array(plannedSection).min(1).max(MAX_SECTIONS);

export const editProposal = z.object({
    changes: z.record(z.string(), z.unknown()),
    explanation: z.string().min(1).max(200),
});

export const sectionInstance = z.object({
    id: z.string().min(1),
    type: sectionKeySchema,
    variant: z.string().min(1),
    brief: z.string(),
    visible: z.boolean(),
    locked: z.boolean(),
    source: z.enum(['ai', 'user', 'profile-default']),
    props: z.record(z.string(), z.unknown()),
});

export const composition = z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    vertical: z.string().min(1),
    artDirection,
    meta: z.object({
        title: z.string(),
        description: z.string(),
        lang: z.string().min(2).max(8),
    }),
    sections: z.array(sectionInstance).min(1).max(MAX_SECTIONS),
});

export const request = {
    classify: z.object({ text: z.string().min(1).max(500) }),
};