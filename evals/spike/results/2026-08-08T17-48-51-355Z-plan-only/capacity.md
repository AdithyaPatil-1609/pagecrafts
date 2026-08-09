# Capacity and latency

Measured over **1** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **3.0** |
| Mean model time | **12.1s** |
| P95 model time | **12.1s** |
| Mean wall clock | 12.6s |
| Pacing overhead | 0.5s |
| Input tokens (all runs) | 1,312 |
| Output tokens (all runs) | 936 |

gemini RPD **20**, minus 15% headroom, divided by 3.0 requests per generation:

## ~5 full generations per day

Shared across the whole team and every beta user.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
