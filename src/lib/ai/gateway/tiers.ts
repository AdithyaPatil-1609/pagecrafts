import { aiConfig, type AiConfig, type Sampling } from '../config';

export type Tier = 'fast' | 'strong';
export type Job = keyof AiConfig['timeouts'];

export function modelFor(tier: Tier): string {
    const { models } = aiConfig();
    return tier === 'fast' ? models.fast : models.strong;
}

export function timeoutFor(job: Job): number {
    return aiConfig().timeouts[job];
}

/** The output-token ceiling for a job (FR-103), sent as max_tokens on each request. */
export function maxOutputFor(job: Job): number {
    return aiConfig().maxOutputTokens[job];
}

/**
 * Sampling for a job (D12). Empty unless configured — an unset value is not
 * sent at all, so the provider default stands and pre-D12 measurements stay
 * comparable.
 */
export function samplingFor(job: Job): Sampling {
    return aiConfig().sampling[job];
}
