# Capacity and latency

Measured over **9** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **10.1** |
| Mean model time | **39.6s** |
| P95 model time | **49.4s** |
| Mean wall clock | 67.1s |
| Pacing overhead | 27.5s |
| Input tokens (all runs) | 47,324 |
| Output tokens (all runs) | 34,583 |
| Mean tokens per generation | **8,812** |

Binding limit for groq: **tokens/day** — throughput is capped by whichever published limit runs out first, minus 15% headroom.

## ~19 full generations per day

Shared across the whole team and every beta user.

> **One generation exceeds the per-minute token budget.** At 8,812 tokens it cannot complete inside a single minute's allowance, so a 429 is expected without token-aware pacing.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
