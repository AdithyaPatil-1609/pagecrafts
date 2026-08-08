import { model, GatewayError } from './gateway';
import { profileSchema as profileResponseSchema } from './gateway/response-schemas';
import { loadTemplate, render } from './harness/templates';
import { stripFences } from './sanitise';
import { verticalProfile } from '@/lib/contracts/schemas/ai';
import {
    SECTION_KEYS, THEME_IDS, MOTION_IDS, RADIUS_IDS, SPACING_IDS, IMAGERY_IDS,
    type VerticalProfile, type AiResult,
} from '@/lib/contracts';

export function normaliseSlug(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}

export async function profile(vertical: string): Promise<AiResult<VerticalProfile>> {
    const slug = normaliseSlug(vertical);
    if (!slug) throw new Error('profile: empty vertical slug.');

    const tpl = loadTemplate('profile.v1');

    const reply = await model.strong.complete({
        job: 'generate',
        system: render(tpl.system, {
            sectionKeys: SECTION_KEYS.join(', '),
            themes: THEME_IDS.join(', '),
            motions: MOTION_IDS.join(', '),
            radii: RADIUS_IDS.join(', '),
            spacings: SPACING_IDS.join(', '),
            imagery: IMAGERY_IDS.join(', '),
        }),
        user: render(tpl.user, { vertical: slug }),
        schema: profileResponseSchema,
    });

    const parsed = verticalProfile.safeParse(JSON.parse(stripFences(reply.text)));
    if (!parsed.success) {
        throw new GatewayError('generation_failed', `profile(${slug}): model output failed validation`, false, {
            raw: reply.text,
            issues: parsed.error.issues,
            usage: reply,
        });
    }

    return { data: { slug, ...parsed.data }, usage: reply };
}