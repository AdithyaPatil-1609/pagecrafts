import type { ContentSchema } from '@/lib/contracts';

/** A stored schema may be {} from the column default. The panel always wants sections. */
export function asContentSchema(value: unknown): ContentSchema {
    if (value && typeof value === 'object' && Array.isArray((value as { sections?: unknown }).sections)) {
        return value as ContentSchema;
    }
    return { sections: [] };
}
