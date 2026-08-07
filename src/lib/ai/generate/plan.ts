import { model } from '../gateway';
import { planSchema } from '../gateway/response-schemas';
import { loadTemplate, render } from '../harness/templates';
import { stripFences } from '../sanitise';
import { generationPlan } from '@/lib/contracts/schemas/ai';
import { normalisePlan } from '../composition/rules';
import {
    SECTION_KEYS,
    type IntentAttributes, type VerticalProfile,
    type SectionInstance, type AiResult,
} from '@/lib/contracts';

export async function plan(
    prompt: string,
    intent: IntentAttributes,
    profile: VerticalProfile,
): Promise<AiResult<SectionInstance[]>> {
    const tpl = loadTemplate('plan.v1');

    const recipe = profile.recipe
        .map((r) => `${r.type}${r.required ? ' (required)' : ''}${r.note ? ` — ${r.note}` : ''}`)
        .join('\n');

    const reply = await model.strong.complete({
        job: 'generate',
        system: render(tpl.system, { sectionKeys: SECTION_KEYS.join(', ') }),
        user: render(tpl.user, {
            prompt, recipe, vertical: intent.vertical, tone: intent.tone,
        }),
        schema: planSchema,
    });

    const raw = JSON.parse(stripFences(reply.text)) as { sections?: unknown };
    const rawSections = Array.isArray(raw.sections) ? raw.sections.slice(0, 7) : (raw.sections ?? []);
    const parsed = generationPlan.safeParse(rawSections);
    if (!parsed.success) {
        throw new Error(`plan: model output failed validation — ${parsed.error.message}`);
    }

    const sections: SectionInstance[] = normalisePlan(parsed.data).map((s, i) => ({
        id: `s_${String(i + 1).padStart(2, '0')}`,
        type: s.type,
        variant: s.variant,
        brief: s.brief,
        visible: true,
        locked: false,
        source: 'ai',
        props: {},
    }));

    return { data: sections, usage: reply };
}