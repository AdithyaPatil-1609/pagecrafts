# Capacity and latency

Measured over **5** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **3.0** |
| Mean model time | **5.6s** |
| P95 model time | **7.4s** |
| Mean wall clock | 5.6s |
| Pacing overhead | 0.0s |
| Input tokens (all runs) | 11,158 |
| Output tokens (all runs) | 10,250 |

groq RPD **1000**, minus 15% headroom, divided by 3.0 requests per generation:

## ~283 full generations per day

Shared across the whole team and every beta user.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
