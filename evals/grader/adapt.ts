import type { SpikeResult } from '../spike/pipeline';
import type { FailureStage, GenerationOutcome } from './index';

/**
 * Which stage a run died at, derived from what it managed to produce rather
 * than from the error text alone. `failureStage` is required on every failure
 * — without it, tuning is guesswork.
 */
export function failureStageOf(result: SpikeResult): FailureStage {
    const error = result.error ?? '';

    // AssemblyError is the only stage that names itself, and it is the one
    // case where every earlier artefact exists.
    if (/^assemble:/.test(error)) return 'assemble';

    if (!result.calls.some((c) => c.stage === 'classify')) return 'classify';
    if (!result.partial?.profile) return 'profile';
    if (!result.partial?.sections) return 'plan';
    return 'fill';
}

const tokensOf = (result: SpikeResult): number =>
    result.calls.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0);

export function toOutcome(result: SpikeResult): GenerationOutcome {
    const cost = {
        requests: result.requests,
        tokens: tokensOf(result),
        latencyMs: result.modelTimeMs,
    };

    if (result.ok && result.composition) {
        return {
            completed: true,
            composition: result.composition,
            // An unreachable classifier returns its safe default rather than
            // throwing, so an absent intent is itself a classify-stage answer.
            category: result.intent?.category ?? 'other',
            ...cost,
        };
    }

    return {
        completed: false,
        failureStage: failureStageOf(result),
        error: result.error ?? 'unknown failure',
        ...cost,
    };
}
