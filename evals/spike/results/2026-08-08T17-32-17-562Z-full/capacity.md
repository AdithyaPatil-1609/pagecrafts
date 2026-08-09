# Capacity and latency

Measured over **1** complete generations.

| Figure | Value |
|---|---|
| Mean requests per generation | **10.0** |
| Mean model time | **13.3s** |
| P95 model time | **13.3s** |
| Mean wall clock | 13.3s |
| Pacing overhead | 0.0s |
| Input tokens (all runs) | 5,139 |
| Output tokens (all runs) | 4,287 |

Project RPD **20**, minus 15% headroom, divided by 10.0 requests per generation:

## ~1 full generations per day

Shared across the whole team and every beta user.

**NFR-003 is measured on model time** — the sum of provider call latency, excluding client-side pacing waits imposed by the rate limit. Wall clock is reported alongside but is not the acceptance figure.
