# Capacity and latency

Measured over **1** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **10.0** |
| Mean model time | **15.3s** |
| P95 model time | **15.3s** |
| Mean wall clock | 112.4s |
| Pacing overhead | 97.0s |
| Input tokens (all runs) | 7,107 |
| Output tokens (all runs) | 4,810 |
| Mean tokens per generation | **11,917** |

Binding limit for groq: **tokens/day** — throughput is capped by whichever published limit runs out first, minus 15% headroom.

## ~14 full generations per day

Shared across the whole team and every beta user.

> **One generation exceeds the per-minute token budget.** At 11,917 tokens it cannot complete inside a single minute's allowance, so a 429 is expected without token-aware pacing.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
