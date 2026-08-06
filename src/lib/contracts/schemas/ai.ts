import { z } from 'zod';
import type { Category } from '@/lib/contracts';
import {
    SECTION_KEYS, THEME_IDS, MOTION_IDS, RADIUS_IDS,
    SPACING_IDS, IMAGERY_IDS, MAX_SECTIONS,
} from '@/lib/contracts';
import { variantsFor } from '@/lib/ai/sections/contracts';

export const categorySchema = z.enum([
    'portfolio', 'restaurant', 'saas', 'blog', 'event',
    'resume', 'agency', 'store', 'nonprofit', 'other',
]) satisfies z.ZodType<Category>;

export const toneSchema = z.enum(['playful', 'formal', 'minimal', 'bold', 'warm']);
export const paletteSchema = z.enum(['light', 'dark', 'colourful', 'muted']);
export const sectionKeySchema = z.enum(SECTION_KEYS);

const slug = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);

export const classification = z.object({
    category: categorySchema.catch('other'),
    vertical: slug.catch('general-business'),
    tone: toneSchema.catch('minimal'),
    palette: paletteSchema.catch('light'),
    sections: z.array(sectionKeySchema).catch([]),
});

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

export const artDirection = z.object({
    themeId: z.enum(THEME_IDS),
    motionId: z.enum(MOTION_IDS),
    radiusId: z.enum(RADIUS_IDS),
    spacingId: z.enum(SPACING_IDS),
    imageryId: z.enum(IMAGERY_IDS),
});

export const verticalProfile = z.object({
    label: z.string().min(1).max(60),
    aliases: z.array(z.string().min(1)).max(8),
    recipe: z.array(z.object({
        type: sectionKeySchema,
        required: z.boolean(),
        note: z.string().max(160).optional(),
    })).min(3).max(MAX_SECTIONS),
    artDirection,
    vocabulary: z.object({ customer: z.string().min(1), purchase: z.string().min(1) }),
    imageQueries: z.array(z.string().min(1)).min(1).max(5),
});

export const plannedSection = z
    .object({
        type: sectionKeySchema,
        variant: z.string().min(1),
        brief: z.string().min(1).max(300),
    })
    .refine((s) => variantsFor(s.type).includes(s.variant), {
        message: 'variant is not registered for this section type',
        path: ['variant'],
    });

export const generationPlan = z.array(plannedSection).min(1).max(MAX_SECTIONS);

export const editProposal = z.object({
    changes: z.record(z.string(), z.unknown()),
    explanation: z.string().min(1).max(200),
});

export const request = {
    classify: z.object({ text: z.string().min(1).max(500) }),
};