import type { SpikeResult } from './pipeline';

export interface Analysis {
    generations: number;
    meanRequests: number;
    meanModelTimeMs: number;
    p95ModelTimeMs: number;
    meanWallClockMs: number;
    pacingOverheadMs: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    meanTokensPerGeneration: number;
    projectedGenerationsPerDay: number;
    /** Which published limit actually caps throughput. */
    bindingLimit: 'requests/day' | 'tokens/day';
    /** True when one generation alone exceeds the per-minute token budget. */
    exceedsTpm: boolean;
}

function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[index] ?? 0;
}

export interface Limits {
    rpd: number;
    /** 0 when the provider does not publish a token limit — then it is not applied. */
    tpm?: number;
    tpd?: number;
}

export function analyse(results: SpikeResult[], limits: Limits | number, headroom = 0.15): Analysis {
    const { rpd, tpm = 0, tpd = 0 } = typeof limits === 'number' ? { rpd: limits } : limits;
    const full = results.filter((r) => r.ok && r.mode === 'full');
    const source = full.length > 0 ? full : results.filter((r) => r.ok);

    const meanRequests = source.reduce((t, r) => t + r.requests, 0) / (source.length || 1);
    const modelTimes = source.map((r) => r.modelTimeMs);
    const meanModelTime = modelTimes.reduce((t, v) => t + v, 0) / (modelTimes.length || 1);
    const meanWallClock = source.reduce((t, r) => t + r.wallClockMs, 0) / (source.length || 1);

    const tokensOf = (r: SpikeResult) =>
        r.calls.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0);
    const meanTokens = source.reduce((t, r) => t + tokensOf(r), 0) / (source.length || 1);

    // Throughput is capped by whichever published limit runs out first. On a
    // token-metered free tier that is usually tokens/day, not requests/day.
    const byRequests = Math.floor((rpd * (1 - headroom)) / (meanRequests || 1));
    const byTokens = tpd > 0 && meanTokens > 0
        ? Math.floor((tpd * (1 - headroom)) / meanTokens)
        : Infinity;

    return {
        generations: source.length,
        meanRequests,
        meanModelTimeMs: Math.round(meanModelTime),
        p95ModelTimeMs: Math.round(percentile(modelTimes, 95)),
        meanWallClockMs: Math.round(meanWallClock),
        pacingOverheadMs: Math.round(meanWallClock - meanModelTime),
        totalInputTokens: results.reduce(
            (t, r) => t + r.calls.reduce((s, c) => s + c.inputTokens, 0), 0),
        totalOutputTokens: results.reduce(
            (t, r) => t + r.calls.reduce((s, c) => s + c.outputTokens, 0), 0),
        meanTokensPerGeneration: Math.round(meanTokens),
        projectedGenerationsPerDay: Math.min(byRequests, byTokens),
        bindingLimit: byTokens < byRequests ? 'tokens/day' : 'requests/day',
        exceedsTpm: tpm > 0 && meanTokens > tpm,
    };
}

export function analysisReport(a: Analysis, rpd: number, provider = 'project'): string {
    return [
        '# Capacity and latency',
        '',
        `Measured over **${a.generations}** complete generations.`,
        '',
        '| Figure | Value |',
        '|---|---|',
        `| Mean requests per generation | **${a.meanRequests.toFixed(1)}** |`,
        `| Mean model time | **${(a.meanModelTimeMs / 1000).toFixed(1)}s** |`,
        `| P95 model time | **${(a.p95ModelTimeMs / 1000).toFixed(1)}s** |`,
        `| Mean wall clock | ${(a.meanWallClockMs / 1000).toFixed(1)}s |`,
        `| Pacing overhead | ${(a.pacingOverheadMs / 1000).toFixed(1)}s |`,
        `| Input tokens (all runs) | ${a.totalInputTokens.toLocaleString()} |`,
        `| Output tokens (all runs) | ${a.totalOutputTokens.toLocaleString()} |`,
        `| Mean tokens per generation | **${a.meanTokensPerGeneration.toLocaleString()}** |`,
        '',
        `Binding limit for ${provider}: **${a.bindingLimit}** — throughput is capped by `
        + `whichever published limit runs out first, minus 15% headroom.`,
        '',
        `## ~${a.projectedGenerationsPerDay} full generations per day`,
        '',
        'Shared across the whole team and every beta user.',
        ...(a.exceedsTpm
            ? ['', `> **One generation exceeds the per-minute token budget.** At `
                + `${a.meanTokensPerGeneration.toLocaleString()} tokens it cannot complete inside a `
                + `single minute's allowance, so a 429 is expected without token-aware pacing.`]
            : []),
        '',
        '**NFR-003 is measured on model time** — the sum of provider call latency, excluding '
        + 'client-side pacing waits imposed by the rate limit. Wall clock is reported alongside '
        + 'but is not the acceptance figure.',
        '',
    ].join('\n');
}