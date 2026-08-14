# Capacity and latency

Measured over **0** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **0.0** |
| Mean model time | **0.0s** |
| P95 model time | **0.0s** |
| Mean wall clock | 0.0s |
| Pacing overhead | 0.0s |
| Input tokens (all runs) | 3,460 |
| Output tokens (all runs) | 2,346 |
| Mean tokens per generation | **0** |

Binding limit for groq: **requests/day** — throughput is capped by whichever published limit runs out first, minus 15% headroom.

## ~850 full generations per day

Shared across the whole team and every beta user.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
