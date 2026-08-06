import type {
    IntentAttributes, VerticalProfile, SectionInstance,
    SectionProps, EditProposal, AiResult,
} from '@/lib/contracts';

export interface FillContext {
    vertical: string;
    tone: string;
    prompt: string;
}

export interface LLMProvider {
    classify(text: string): Promise<AiResult<IntentAttributes>>;

    profile(vertical: string): Promise<AiResult<VerticalProfile>>;

    plan(
        prompt: string,
        intent: IntentAttributes,
        profile: VerticalProfile,
    ): Promise<AiResult<SectionInstance[]>>;

    fillSection(
        instance: SectionInstance,
        context: FillContext,
    ): Promise<AiResult<SectionProps>>;

    edit(
        section: SectionInstance,
        instruction: string,
    ): Promise<AiResult<EditProposal>>;
}