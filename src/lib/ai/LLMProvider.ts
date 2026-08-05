import type {
    IntentAttributes, SitePlan, FilledSection, SectionKey, EditProposal, AiResult,
} from '@/shared-types';

export interface LLMProvider {
    classify(text: string): Promise<AiResult<IntentAttributes>>;

    plan(prompt: string, intent: IntentAttributes): Promise<AiResult<SitePlan>>;

    fillSection(
        key: SectionKey,
        plan: SitePlan,
        shell: string,
    ): Promise<AiResult<FilledSection>>;

    edit(
        filePath: string,
        fileContent: string,
        instruction: string,
    ): Promise<AiResult<EditProposal>>;
}