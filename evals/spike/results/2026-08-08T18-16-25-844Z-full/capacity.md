# Capacity and latency

Measured over **1** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **10.0** |
| Mean model time | **29.3s** |
| P95 model time | **29.3s** |
| Mean wall clock | 29.9s |
| Pacing overhead | 0.5s |
| Input tokens (all runs) | 4,232 |
| Output tokens (all runs) | 2,850 |
| Mean tokens per generation | **7,082** |

Binding limit for groq: **tokens/day** — throughput is capped by whichever published limit runs out first, minus 15% headroom.

## ~24 full generations per day

Shared across the whole team and every beta user.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
