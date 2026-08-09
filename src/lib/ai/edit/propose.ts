import { model } from '../gateway';
import { loadTemplate, render } from '../harness/templates';
import { stripFences, sanitise, sanitiseDeep } from '../sanitise';
import { editProposal } from '@/lib/contracts/schemas/ai';
import type {
    SectionInstance, EditProposal, PatchOp, AiResult,
} from '@/lib/contracts';

export async function proposeEdit(
    section: SectionInstance,
    instruction: string,
): Promise<AiResult<EditProposal>> {
    const tpl = loadTemplate('edit.v1');

    const reply = await model.strong.complete({
        job: 'edit',
        system: tpl.system,
        user: render(tpl.user, {
            instruction,
            sectionKey: section.type,
            variant: section.variant,
            content: JSON.stringify(section.props, null, 2),
        }),
    });

    const parsed = editProposal.safeParse(JSON.parse(stripFences(reply.text)));
    if (!parsed.success) throw new Error(`proposeEdit: ${parsed.error.message}`);

    const clean = sanitiseDeep(parsed.data.changes);

    const patch: PatchOp[] = Object.entries(clean).map(([key, value]) => ({
        op: key in section.props ? 'replace' : 'add',
        path: `/props/${key}`,
        value,
    }));

    return {
        data: {
            targetSectionId: section.id,
            patch,
            // FR-066: sanitise before it is *rendered*, not only before it is
            // applied — a proposal the user rejects is still shown to them.
            explanation: sanitise(parsed.data.explanation).clean,
            applied: false,
        },
        usage: { ...reply, promptVersion: `${tpl.id}.${tpl.version}` },
    };
}