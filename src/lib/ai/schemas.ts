import { z } from 'zod';
import type { Category } from '@/lib/contracts';

export const CATEGORIES = [
    'portfolio', 'restaurant', 'saas', 'blog', 'event',
    'resume', 'agency', 'store', 'nonprofit', 'other',
    'fitness', 'food', 'photography', 'architecture', 'education', 'travel', 'business',
    'beauty', 'real_estate', 'healthcare', 'design', 'professional_services', 'entertainment',
    'hospitality', 'automotive', 'media',
    'sports', 'health_wellness', 'pets', 'arts_culture', 'retail', 'finance',
    'wellness', 'health', 'creative', 'technology',
] as const satisfies readonly Category[];

type MissingFromCategories = Exclude<Category, (typeof CATEGORIES)[number]>;
const _categoriesAreExhaustive: MissingFromCategories extends never ? true : never = true;
void _categoriesAreExhaustive;

export const categorySchema = z.enum(CATEGORIES) satisfies z.ZodType<Category>;

export const CATEGORY_LIST = CATEGORIES.join(', ');