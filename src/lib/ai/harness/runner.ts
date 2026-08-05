import { GeminiProvider } from '../providers/gemini';
import { loadTemplate, render } from './templates';

export interface RunOptions {
    template: string;
    vars: Record<string, string>;
    tier?: 'fast' | 'strong';
    provider?: GeminiProvider;
}

export interface RunResult {
    templateId: string;
    templateVersion: string;
    model: string;
    output: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    ranAt: string;
}

export async function runPrompt(opts: RunOptions): Promise<RunResult> {
    const tpl = loadTemplate(opts.template);
    const provider = opts.provider ?? new GeminiProvider();

    const reply = await provider.raw({
        tier: opts.tier ?? tpl.tier,
        system: render(tpl.system, opts.vars),
        user: render(tpl.user, opts.vars),
    });

    return {
        templateId: tpl.id,
        templateVersion: tpl.version,
        model: reply.model,
        output: reply.text,
        inputTokens: reply.inputTokens,
        outputTokens: reply.outputTokens,
        latencyMs: reply.latencyMs,
        ranAt: new Date().toISOString(),
    };
}