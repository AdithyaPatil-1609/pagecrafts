# Capacity and latency

Measured over **1** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **3.0** |
| Mean model time | **9.0s** |
| P95 model time | **9.0s** |
| Mean wall clock | 9.1s |
| Pacing overhead | 0.1s |
| Input tokens (all runs) | 2,145 |
| Output tokens (all runs) | 1,450 |

groq RPD **1000**, minus 15% headroom, divided by 3.0 requests per generation:

## ~283 full generations per day

Shared across the whole team and every beta user.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
