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
at **10 of 10** on the D8 re-run, and art direction is fully differentiated — 9
distinct (theme, motion) pairs. The named guardrails are: **NFR-003 is unproven**
because both P95 measurements included client-side pacing and a clean re-run is
still owed, the corpus is **10 verticals rather than 30** so no rate here can carry
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

**Corpus size: 30 verticals**, grown from 10 during D8–D10. It now covers all 17
categories, with 20 of 30 having no hand-authored template — the population the
"no template" claim is actually about. The measurements below were taken on the
10-vertical corpus; **they have not been re-taken at 30**, so the pass rate here
still carries a denominator of 10, not 30.

Run: `evals/spike/results/2026-08-09T14-00-57-553Z-full` (D8 re-run)

| | |
|---|---|
| Verticals | 10 (6 with no hand-authored template) |
| Mode | `full` |
| **Auto pass rate** | **10 of 10** on the D8 re-run (9 of 10 on D7) |
| Calls served | 87 Groq · 12 Gemini |
| Tokens | 84,805 (48,406 in / 36,399 out) |
| Repairs used | 5, all genuine validation failures |
| Sections scored ≥4 for copy | *(human rows pending)* |

### The D7 failure did not recur

On D7 `restaurant` failed at the **plan** stage with both providers down at the
same moment — Groq timed out and Gemini's 20 RPD was already spent. It never
reached a fill call, so it never said anything about quality. On the D8 re-run,
with `Retry-After` back-off in place, it completed. **10 of 10.**

### Art direction — diversity held across the corpus

**9 distinct (theme, motion) pairs across 10 runs.** Six of eight themes and
**all six** motions were used, and the pairings are apt: `mono-precision
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
| restaurant | yes | pass | pass | — | — | — |
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

### NFR-003 — not yet answerable, and the reason is a measurement defect

Two corpus runs, and the re-run moved the wrong way:

| Figure | Run 1 (D7) | Run 2 (D8, after the repair fix) |
|---|---|---|
| Pass rate | 9 of 10 | **10 of 10** |
| Mean model time | 39.6s | 36.2s |
| P95 model time | 49.4s | **73.5s** |
| Mean wall clock | 67.1s | 72.2s |

Pass rate improved and the mean came down, but P95 nearly doubled. The cause is
not the pipeline — it is that **`latencyMs` was counting our own waiting**. The
limiter's pacing sleep and the `Retry-After` back-off both happen inside
`complete()`, so a call that waited 27s for a rate limit recorded 27s of "model
time". NFR-003 explicitly measures provider time and excludes client-side pacing.

Fixed: `acquire()` now reports what it waited, and both waits are subtracted from
`latencyMs`. **Neither run's P95 is a valid NFR-003 figure** — run 1 understated
the problem, run 2 overstated it, and both included pacing. A third run is needed
before the requirement can be called met or missed, and it should be done before
the D10 review rather than argued about there.

What can be said now: the pipeline completed **10 of 10** verticals, and wall
clock — which legitimately includes pacing — is 72.2s per generation. That is the
number a user would feel, and it is why the SSE progress stream matters.

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

Thirteen repairs fired on the D7 run, but only **six** were genuine validation
failures. The other seven were chain exhaustion — *"all AI providers failed"* —
being retried as though the reply had been malformed. The D8 re-run, with the fix
in place, used **5 repairs, all genuine**.

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

Corpus totals: **99 calls · 84,805 tokens · 0.0000c**. Cost is zero because both
providers are on free tiers with price tables set to 0 — the plumbing is exercised
and per-provider, but the reconciliation claim in NFR-142 is untested until a paid
tier supplies real rates.

**Known gap:** the `generations` table exists but has `model` and no `provider`,
`prompt_version`, `latency_ms` or `stage`. The ledger produces all four and none
can be stored. Needs an `ALTER TABLE` from E1 before D9's persistence work.

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
| **E2 / A3 §6 Gate 1 · Groq training-data terms** — recorded in `docs/ai/GATE1_GROQ_TRAINING.md`. Groq does not train on Inputs/Outputs. Cerebras is out of the chain and out of this record. | Hanish | **closed 2026-08-14** |
| A3 §7 — Gemini billing | Adithya | open |
| `generations.provider` column | Adithya | open |

---

## Actions

| Action | Owner | By |
|---|---|---|
| Re-run the corpus after the repair-scope fix and re-measure P95 model time against NFR-003 | Hanish | D8 |
| Fill the rubric's 1–5 columns by reading the generated copy | Hanish | before the decision line |
| Grow the corpus from 10 to 30 verticals | Hanish | before D11 |
| Gemini's 20 RPD is exhausted by ~6 fallback calls — it cannot absorb a Groq outage at corpus scale | Adithya (billing) | D8 |
| Record Groq's training-data terms (E2 / Gate 1) | Hanish | **done 2026-08-14** — `docs/ai/GATE1_GROQ_TRAINING.md` |
| `provider` column on `generations` | Adithya | D9 |
| Share the capacity figures — job runner intervals were sized against Gemini | Hanish → E5 | D8 |
| Tell E3 that classification was returning coerced defaults — their gallery ranking received `tone: minimal` for every user until D6 | Hanish | **today** |
