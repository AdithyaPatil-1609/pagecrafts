import { model } from '../gateway';
import { loadTemplate, render } from '../harness/templates';
import { stripFences, sanitiseDeep } from '../sanitise';
import { contractFor } from '../sections/contracts';
import type { SectionInstance, SectionProps, AiResult } from '@/lib/contracts';

export interface FillContext {
    vertical: string;
    tone: string;
    prompt: string;
    customerWord: string;
}

export async function fillSection(
    instance: SectionInstance,
    context: FillContext,
): Promise<AiResult<SectionProps>> {
    const contract = contractFor(instance.type);
    const tpl = loadTemplate('fill-section.v1');

    const reply = await model.strong.complete({
        job: 'generate',
        system: render(tpl.system, {
            vertical: context.vertical,
            customerWord: context.customerWord,
        }),
        user: render(tpl.user, {
            sectionKey: instance.type,
            variant: instance.variant,
            brief: instance.brief,
            tone: context.tone,
            fields: contract.fieldList,
            prompt: context.prompt,
        }),
        schema: contract.json,
    });

    const raw = JSON.parse(stripFences(reply.text));
    const clean = sanitiseDeep(raw);
    const parsed = contract.fill.safeParse(clean);
    if (!parsed.success) {
        throw new Error(`fillSection(${instance.type}): ${parsed.error.message}`);
    }

    return { data: parsed.data as SectionProps, usage: reply };
}
