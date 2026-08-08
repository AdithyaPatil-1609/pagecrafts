import { model, GatewayError } from '../gateway';
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

    // Groq/Cerebras may return image fields as a plain string instead of
    // { query, alt }. Coerce before validation so one bad shape doesn't
    // sink the whole section.
    const imageKeys = new Set(
        contract.fields.filter((f) => f.type === 'image').map((f) => f.key),
    );
    if (clean && typeof clean === 'object') {
        const obj = clean as Record<string, unknown>;
        const fallbackStr = `${context.vertical} ${instance.type}`;
        for (const key of imageKeys) {
            const val = obj[key];
            if (typeof val === 'string') {
                const q = val.trim() || fallbackStr;
                obj[key] = { query: q, alt: q };
            } else if (val && typeof val === 'object') {
                const imgObj = val as Record<string, unknown>;
                const q = (typeof imgObj.query === 'string' && imgObj.query.trim()) || fallbackStr;
                const a = (typeof imgObj.alt === 'string' && imgObj.alt.trim()) || q;
                obj[key] = { query: q, alt: a };
            } else {
                obj[key] = { query: fallbackStr, alt: fallbackStr };
            }
        }

        // Provider models may return alternative key names for list item fields
        // (e.g. `name` instead of `title`, `description` instead of `body`).
        for (const f of contract.fields) {
            if (f.type === 'list' && Array.isArray(obj[f.key])) {
                const items = obj[f.key] as Record<string, unknown>[];
                for (const item of items) {
                    if (item && typeof item === 'object') {
                        if (!item.title && typeof item.name === 'string') item.title = item.name;
                        if (!item.title && typeof item.heading === 'string') item.title = item.heading;
                        if (!item.body && typeof item.description === 'string') item.body = item.description;
                        if (!item.body && typeof item.detail === 'string') item.body = item.detail;
                        if (!item.body && typeof item.text === 'string') item.body = item.text;
                        if (!item.quote && typeof item.text === 'string') item.quote = item.text;
                        if (!item.author && typeof item.name === 'string') item.author = item.name;
                    }
                }
            }
        }
    }

    const usage = { ...reply, promptVersion: `${tpl.id}.${tpl.version}` };

    const parsed = contract.fill.safeParse(clean);
    if (!parsed.success) {
        throw new GatewayError('generation_failed', `fillSection(${instance.type}): model output failed validation`, false, {
            raw: reply.text,
            issues: parsed.error.issues,
            usage,
        });
    }

    return { data: parsed.data as SectionProps, usage };
}
