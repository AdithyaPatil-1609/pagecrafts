# R5 · AI — D15 quality milestone

Owner: Hanish. Recorded 2026-08-14.

> **Status: closed on Groq free, v3 defaults.**
>
> Schedule: *90% of 30 verticals produce a sensible, non-blank page; injection
> contained; visual-diversity metric recorded.*
>
> Evidence: `evals/grader/results/2026-08-14T07-58-07-237Z-d15-sensible-full/`

Do not mix this sheet with the v1 D11 baseline (`…T05-13-47-751Z-baseline-full`).
That run is the before; this run is the bar.

## Scorecard

| Clause | Bar | Result | Close? |
|---|---|---|---|
| Non-blank page (machine) | ≥27/30 | **30/30** | Yes |
| Sensible page (human copy ≥4) | ≥27/30 | **28/30 (93%)** | Yes |
| Injection contained | AC-F11 in CI | D13 | Yes |
| Diversity **recorded** | report the number | clinical-blue **23%**, calm **40%**, **passes** | Yes |

Copy mean **4.10**. Sections **4.27**. Art **4.07**. Human columns complete.
v21 SaaS timed out at plan on the first attempt; that row was stripped and
retried — not scored as a 429.

Spend: 296 requests · 487,170 tokens. Provider: Groq only.

## The two copy 3s (still under 4, not machine fails)

| Id | Vertical | Why 3 | Later code |
|---|---|---|---|
| v21 | saas | Invented `1-800-555-0123` / `sales@inventorytool.com`. No pricing table (FAQ said “see our pricing page”). | `947aad4` — ungrounded phone/email scrubbed; pricing ask forces a services/menu section |
| v29 | sweet-shop | Prompt asked for **मिठास स्वीट्स** on the hero; fill wrote “Mithaas Sweet Shop”. | `947aad4` — `preserveNativeFields` puts their letters back |

Those fixes are in code. They are **not** a second 30-run. Do not claim 30/30
copy ≥4.

## What this is not

- Not the v1 D11 13/30 copy sheet.
- Not a D18 cap proof (429s on this run were quota, never quality).
- Not a live D13 model-compliance run (containment is structural; see D13).
