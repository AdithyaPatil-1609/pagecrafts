# D7 — Generation quality go/no-go, v2

> **Groq · `openai/gpt-oss-120b` (strong) / `openai/gpt-oss-20b` (fast) · prompts `v1` · strict `json_schema`**

Owner: Hanish (R5 · AI) · Supersedes `docs/ai/D5_GO_NO_GO.md`
Evidence: `evals/spike/results/<run>/` · reproduce with `npm run spike -- --mode=full`

The first line names the provider and model on purpose (Amendment A3 §6 Gate 2).
The D5 memo's evidence was gathered on a mix of Groq and Gemini as the chain fell
through; this one is a claim about the models named above and stops being true if
`AI_PROVIDER_ORDER` changes.

---

## Decision

**[ GO | GO WITH GUARDRAILS | NO-GO ]** — *to be set.*

One paragraph: what was decided, and the single strongest reason.

On this evidence **GO WITH GUARDRAILS** is what the data supports. Structure holds
at 90% across the corpus, the single failure was a provider outage rather than a
bad generation, and art direction is fully differentiated — 9 distinct pairs over 9
runs. The named guardrails are: **P95 model time breaches NFR-003** (49.4s against
45s), the corpus is **10 verticals rather than 30** so no pass rate here can carry
AC-F4-1, and the **copy has not been read** — every 1–5 column is still empty.

The decision line is not mine to set; the rubric's human rows should be filled
first, because "the copy is usable" is the one claim this memo cannot make for you.

---

## What changed since D5

The D5 memo could not report a rate, because the sample was one full generation
and five plan-onlys. Four things landed since:

| Change | Effect on the evidence |
|---|---|
| Strict `json_schema` on the compat path | Enums are enforced by the provider again, not just by Zod |
| `gpt-oss` models on Groq | The llama models reject `json_schema` outright — this is what turned 10-of-10 failures into successes |
| Token-aware pacing | The 429s were structural (one generation = 1.2× the per-minute budget), not flaky |
| One repair attempt (BR-09) | A section that fails validation gets exactly one more try before the run is abandoned |

---

## The corpus

**Corpus size: 10 verticals, not 30.** Stated plainly because it matters: the D11
target assumes 30, and AC-F4-1's ≥85% bar is not meaningfully measurable at 10.
The corpus has to grow before D11 — that is a finding for today, not a surprise
for later.

Run: `evals/spike/results/2026-08-08T18-37-21-011Z-full`

| | |
|---|---|
| Verticals | 10 (6 with no hand-authored template) |
| Mode | `full` |
| **Auto pass rate** | **90% — 9 of 10** |
| Calls served | 87 Groq · 6 Gemini |
| Tokens | 81,907 (47,324 in / 34,583 out) |
| Sections scored ≥4 for copy | *(human rows pending)* |

### The one failure was availability, not quality

`restaurant` failed at the **plan** stage with both providers down at the same
moment: Groq timed out, and Gemini returned 429 — its 20 RPD was already spent.
It never reached a fill call, so it says nothing about generation quality. The
distinction matters: 9 of 9 verticals that got a working provider produced a site.

### Art direction — diversity held across the corpus

**9 distinct (theme, motion) pairs across 9 runs — no two alike.** Six of eight
themes and **all six** motions were used, and the pairings are apt: `mono-precision
/ none` for the law firm, `vivid-energy / kinetic` for the gym, `tech-slate / calm`
for SaaS, `calm-sage / calm` for yoga.

This was the single most important thing to check — it is the failure that retired
Wix ADI — and at corpus scale the profile prompt is choosing art direction
appropriately rather than reaching for one striking default.

### Rubric

*(structure/non-blank are machine-derived; the 1–5 columns need a human pass over
the generated copy in each `<vertical>.md`)*

| Vertical | Template | Structure | Non-blank | Copy 1–5 | Sections apt 1–5 | Art dir apt 1–5 |
|---|---|---|---|---|---|---|
| dental-clinic | no | pass | pass | — | — | — |
| law-firm | no | pass | pass | — | — | — |
| yoga-studio | no | pass | pass | — | — | — |
| ngo | no | pass | pass | — | — | — |
| restaurant | yes | **fail** | — | — | — | — |
| photography | yes | pass | pass | — | — | — |
| saas | yes | pass | pass | — | — | — |
| gym | yes | pass | pass | — | — | — |
| unknown | no | pass | pass | — | — | — |
| interior-design | no | pass | pass | — | — | — |

---

## Capacity — token-bound, not request-bound

Groq's published free-tier limits for these models are **30 RPM · 1,000 RPD ·
8,000 TPM · 200,000 TPD**. A full generation measured **9,426 tokens** over 10
calls, which makes tokens the binding constraint:

| Limit | Full generations/day | Binding? |
|---|---|---|
| RPD 1,000 | 100 | no |
| **TPD 200,000** | **~18** | **yes** |

A single generation exceeds the 8,000 TPM budget on its own, so pacing is not
optional — it is the difference between a corpus run and a wall of 429s. The
corpus measured 8,812 tokens per generation and **~19 full generations/day**.

### NFR-003 — model time is at the limit, and P95 breaches it

| Figure | Corpus | Budget |
|---|---|---|
| Mean model time | 39.6s | 45s |
| **P95 model time** | **49.4s** | **45s — breached** |
| Mean wall clock | 67.1s | reported, not the acceptance figure |
| Pacing overhead | 27.5s | deliberate; the alternative is a 429 |

**This is the finding that most deserves attention.** The single-vertical run on
D6 measured 13.3s; at corpus scale it is 39.6s mean and 49.4s at P95. Two causes,
and only one of them is now fixed:

- **Retries inflate model time.** Each repair and each `Retry-After` wait adds a
  real provider call to the sum. Seven of the thirteen repairs in this run were
  mis-scoped (see below) and will not recur, which should pull the figure down —
  but by how much is unmeasured, and a re-run is needed before claiming NFR-003.
- **Groq under sustained load is slower than a single call suggests.** Timeouts
  appeared repeatedly during the corpus that never appeared in isolation.

Do not report "under 45s" as met. The mean is inside it; P95 is not.

---

## The failure path, proven deliberately

Week 2's exit condition is not "it works" — it is that the failure path was proven
by breaking it. Four breakages, each with a test in
`tests/unit/ai/failure-path.test.ts`:

| Break | Behaviour | Requirement |
|---|---|---|
| Invalid shape twice | exactly **one** repair, then abandon — never a third attempt | BR-09, FR-044/045 |
| Provider returns 429 | chain advances; the user sees nothing | A3 §5.1 |
| Every provider fails | one aggregate error naming each, then nearest-template fallback | Week-3 exit |
| Request over the token ceiling | rejected **before** dispatch | FR-103, AC-F10-5 |

A rate limit is explicitly *not* repairable — that is the chain's job — so the two
mechanisms cannot compound into several attempts against the same fault.

### A defect the corpus run found in the repair path

Thirteen repairs fired across the corpus, but only **six** were genuine validation
failures. The other seven were chain exhaustion — *"all AI providers failed"* —
being retried as though the reply had been malformed.

The cause: `FallbackGateway` raises exhaustion as a non-retryable
`generation_failed`, which is exactly the signature the repair path treats as
repairable. So every provider had already been tried, and the repair tried again.
It usually *worked*, because the rate limit had cleared by then — which is what
made it invisible in the pass rate and visible only in the repair log.

Fixed: exhaustion is now tagged `chainExhausted`, and the repair path excludes it
(regression test in `failure-path.test.ts`). Two consequences for reading this
memo: the repair count above is inflated relative to what the code now does, and
the model-time figures include those wasted calls.

---

## Cost

Every model call writes a ledger row — successful or failed — carrying provider,
model, prompt version, tokens, cost and status. Pricing is per provider: a Groq
call is never costed at Gemini's rate, which is what NFR-142's 5% reconciliation
requires across three invoices.

Corpus totals: **93 calls · 81,907 tokens · 0.0000c**. Cost is zero because both
providers are on free tiers with price tables set to 0 — the plumbing is exercised
and per-provider, but the reconciliation claim in NFR-142 is untested until a paid
tier supplies real rates.

**Known gap:** the `generations` table has `model` but **no `provider` column**.
The ledger produces the value and nothing can store it. Needs a migration from E1
before D9's persistence work.

---

## Confidence

State what this sample supports and what it does not.

A 10-vertical corpus supports a statement about whether the copy is usable and
whether art direction varies. It does **not** support AC-F4-1's ≥85% claim — that
needs the 30-vertical corpus at D11. Report the count with its denominator, never
a bare percentage.

---

## Fallback posture

If quality is below the bar, name one lever: tighten the plan stage, tighten the
section contracts, or demote generation to P1 and let the template path carry the
product. "We'll see" is not a posture.

---

## Open gates

| Gate | Owner | State |
|---|---|---|
| **E2 · free-tier training-data terms for Groq** — the PRD promises user content is never used for training; a provider that reserves that right is development-only and excluded by config | Hanish | **open — blocks beta** |
| A3 §6 Gate 1 — same question, recorded in the amendment | Hanish + E1 | open |
| A3 §7 — E1 initials on the billing gate | Adithya | open |
| `generations.provider` column | Adithya | open |
| Cerebras account unfunded (HTTP 402) — out of the chain until resolved | Hanish | open |

---

## Actions

| Action | Owner | By |
|---|---|---|
| Re-run the corpus after the repair-scope fix and re-measure P95 model time against NFR-003 | Hanish | D8 |
| Fill the rubric's 1–5 columns by reading the generated copy | Hanish | before the decision line |
| Grow the corpus from 10 to 30 verticals | Hanish | before D11 |
| Gemini's 20 RPD is exhausted by ~6 fallback calls — it cannot absorb a Groq outage at corpus scale | Adithya (billing) | D8 |
| Record Groq's training-data terms (E2) | Hanish | before any external user |
| `provider` column on `generations` | Adithya | D9 |
| Share the capacity figures — job runner intervals were sized against Gemini | Hanish → E5 | D8 |
| Tell E3 that classification was returning coerced defaults — their gallery ranking received `tone: minimal` for every user until D6 | Hanish | **today** |
