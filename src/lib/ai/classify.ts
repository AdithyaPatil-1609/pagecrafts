import { model } from './gateway';
import { classifySchema } from './gateway/response-schemas';
import { loadTemplate, render } from './harness/templates';
import { stripFences } from './sanitise';
import { classification, coercedFields, isClassificationShaped } from '@/lib/contracts/schemas/ai';
import { CATEGORY_LIST } from './schemas';
import {
    SECTION_KEYS, MAX_CLASSIFY_CHARS,
    type IntentAttributes, type AiResult, type Usage,
} from '@/lib/contracts';

// The allowed buckets, from the single source of truth so the prompt can never list a
// category the schema would reject (or miss one the library now ships).
const CATEGORIES = CATEGORY_LIST;

const SAFE: IntentAttributes = {
    category: 'other',
    vertical: 'general-business',
    tone: 'minimal',
    palette: 'light',
    sections: ['hero', 'about', 'contact'],
    fallback: true,
};

const NO_USAGE: Usage = { model: 'none', inputTokens: 0, outputTokens: 0, latencyMs: 0 };

export async function classify(text: string): Promise<AiResult<IntentAttributes>> {
    const input = text.trim().slice(0, MAX_CLASSIFY_CHARS);
    if (!input) return { data: SAFE, usage: NO_USAGE };

    const tpl = loadTemplate('classify.v1');

    try {
        const reply = await model.fast.complete({
            job: 'classify',
            system: render(tpl.system, {
                categories: CATEGORIES,
                sectionKeys: SECTION_KEYS.join(', '),
            }),
            user: render(tpl.user, { text: input }),
            schema: classifySchema,
        });

        const usage: Usage = { ...reply, promptVersion: `${tpl.id}.${tpl.version}` };

        const raw: unknown = JSON.parse(stripFences(reply.text));
        if (!isClassificationShaped(raw)) return { data: SAFE, usage };

        const coerced = coercedFields(raw);
        const parsed = classification.safeParse(raw);
        if (!parsed.success) return { data: SAFE, usage };

        if (coerced.length > 0) {
            console.warn(`classify: coerced ${coerced.join(', ')}`);
        }

        return {
            data: { ...parsed.data, fallback: coerced.includes('category') },
            usage,
        };
    } catch (err) {
        console.warn(`classify: fell back — ${err instanceof Error ? err.message : err}`);
        return { data: SAFE, usage: NO_USAGE };
    }
}