import { z } from 'zod';
import type { Category } from '@/lib/contracts';
import {
    SECTION_KEYS, THEME_IDS, MOTION_IDS, RADIUS_IDS,
    SPACING_IDS, IMAGERY_IDS, MAX_SECTIONS,
} from '@/lib/contracts';

export const categorySchema = z.enum([
    'portfolio', 'restaurant', 'saas', 'blog', 'event',
    'resume', 'agency', 'store', 'nonprofit', 'other',
    'fitness', 'food', 'photography', 'architecture', 'education', 'travel', 'business',
]) satisfies z.ZodType<Category>;

export const toneSchema = z.enum(['playful', 'formal', 'minimal', 'bold', 'warm']);
export const paletteSchema = z.enum(['light', 'dark', 'colourful', 'muted']);
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

// On the OpenAI-compatible path the provider does not enforce enums (json_object
// mode, not responseSchema), so an invented id would otherwise fail the whole
// profile. Each id falls back to the first registered value instead — the model
// picking a bad theme degrades the art direction, it does not sink generation.
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

// `type` is intentionally lenient (not `sectionKeySchema`): on the compat path an
// unknown section type must reach normalisePlan to be dropped-and-reported, not
// fail the whole plan array. Legality of both `type` and `variant` is enforced in
// normalisePlan (composition/rules.ts).
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

export const request = {
    classify: z.object({ text: z.string().min(1).max(500) }),
};