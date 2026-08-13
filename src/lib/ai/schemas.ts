import { CATEGORY_IDS } from '@/lib/contracts';

/**
 * The prompt's offer list, the provider's response schema and the contract
 * validator must all name the same buckets — otherwise the model is invited to
 * return a category that is then silently rewritten. All three now derive from
 * `CATEGORY_IDS`; this module only re-exports it under its established name.
 */
export const CATEGORIES = CATEGORY_IDS;

export { categorySchema } from '@/lib/contracts/schemas/ai';

export const CATEGORY_LIST = CATEGORIES.join(', ');