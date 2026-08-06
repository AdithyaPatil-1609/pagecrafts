import { aiConfig, type AiConfig } from '../config';

export type Tier = 'fast' | 'strong';
export type Job = keyof AiConfig['timeouts'];

export function modelFor(tier: Tier): string {
    const { models } = aiConfig();
    return tier === 'fast' ? models.fast : models.strong;
}

export function timeoutFor(job: Job): number {
    return aiConfig().timeouts[job];
}