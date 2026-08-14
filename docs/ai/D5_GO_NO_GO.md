# D5 — Generation quality go/no-go

Owner: Hanish (R5 · AI) · Date: D5
Evidence: `evals/spike/results/<run>/` · reproduce with `npm run spike`

> **Status: evidence complete, decision line not yet set.**
> The measurements below are real and reproducible. The human copy scores (1–5)
> and the Decision line are Hanish's to fill after reading the generated copy.

---

## Decision

**[ GO | GO WITH GUARDRAILS | NO-GO ]** — *to be set.*

One paragraph. What was decided, and the single strongest reason.

On the evidence below, **GO WITH GUARDRAILS** is the outcome the data supports:
auto pass rate is 100% over six real runs, art direction is genuinely diverse and
appropriate, and the one full generation produced specific, usable copy. The
guardrail is sample size, not quality — six runs cannot carry a pass *rate*.

---

## What was measured

| | |
|---|---|
| Verticals attempted | 6 |
| Full generations completed | **1** (`dental-clinic`) |
| Plan-only completed | **5** (law-firm, yoga-studio, ngo, restaurant, gym) |
| Verticals with no hand-authored template | 4 of 6 |
| Prompt version | `v1` (recorded per call) |
| Provider | `groq` — served every call, no fallback needed |
| Models | `openai/gpt-oss-120b` (strong) / `openai/gpt-oss-20b` (fast) |
| Runs | `…17-32-17Z-full`, `…17-35-22Z-plan-only` |

The provider and model above are recorded on **every call** in `raw.json`
(`usage.provider`, `usage.model`, `usage.promptVersion`). Per Amendment A3 §6
Gate 2, any quality claim in this memo is a claim about *that* provider and
model, and stops being true if `AI_PROVIDER_ORDER` changes.

### Rubric

| Vertical | Template | Structure | Sections | Non-blank | Copy 1–5 | Sections apt 1–5 | Art dir apt 1–5 |
|---|---|---|---|---|---|---|---|
| dental-clinic | no | pass | 7 | pass | — | — | — |
| law-firm | no | pass | 7 | plan-only | — | — | — |
| yoga-studio | no | pass | 5 | plan-only | — | — | — |
| ngo | no | pass | 7 | plan-only | — | — | — |
| restaurant | yes | pass | 7 | plan-only | — | — | — |
| gym | yes | pass | 7 | plan-only | — | — | — |

**Auto pass rate:** 100% (6 of 6) · **Copy scored ≥4:** — of — *(human rows pending)*

---

## The claim this milestone exists to test

> A business type with no hand-authored template receives a site that looks
> intentionally designed for it.

**Verdict:** provisionally yes, on one generation.

`dental-clinic` has no hand-authored template. It produced 7 sections in a
sensible order, art direction `calm-sage / calm / soft / airy / bright-clean`,
and copy that used the specifics from the prompt — Koramangala, check-ups, root
canals, braces — with no "Welcome to our website" filler.

Notably the contact section returned **"Not listed"** for phone, email and hours
rather than inventing them. Declining to fabricate a phone number is the correct
behaviour and is worth keeping through prompt tuning.

Read the full output at `evals/spike/results/…17-32-17Z-full/dental-clinic.md`
before signing the decision line.

---

## Visual diversity

**Distinct (theme, motion) pairs across 6 real runs: 5.**

| Vertical | Theme | Motion |
|---|---|---|
| law-firm | `mono-precision` | `none` |
| dental-clinic | `calm-sage` | `calm` |
| yoga-studio | `calm-sage` | `calm` |
| ngo | `warm-editorial` | `calm` |
| restaurant | `warm-editorial` | `whisper` |
| gym | `vivid-energy` | `kinetic` |

Four distinct themes, four distinct motions. **The collapse did not happen.** The
pairings are also apt rather than merely varied: sober and static for the law
firm, energetic for the gym, calm and green for the yoga studio, warm for the
restaurant and the NGO.

This was the single most consequential thing to check today — it is the failure
that retired Wix ADI — and on this sample the profile prompt is choosing art
direction *appropriately*, not reaching for the striking option every time.

Caveat: `dental-clinic` returned `clinical-blue` on an earlier run and
`calm-sage` here. Both are defensible for a dental clinic, but it shows the
choice is not deterministic across runs. Worth watching at D11, not worth acting
on now.

---

## Capacity

From `capacity.md` in the run directory. Requests per generation, model time,
wall clock, projected generations per day.

**Model time is the NFR-003 figure; wall clock is reported alongside and is not
the acceptance number.**

| Figure | Full generation | Plan-only |
|---|---|---|
| Requests per generation | 10.0 | 3.0 |
| Mean model time | **13.3s** | 5.6s |
| P95 model time | 13.3s | 7.4s |

**13.3s against the 45s NFR-003 budget**, with no pacing overhead — Groq's limits
do not require the 13s inter-call pacing Gemini's free tier did.

### Capacity is token-bound, not request-bound

Groq's published free-tier limits for the `gpt-oss` models are **30 RPM · 1,000
RPD · 8,000 TPM · 200,000 TPD**. The measured generation costs **9,426 tokens**
across 10 calls, which makes tokens — not requests — the binding constraint:

| Limit | Full generations/day | Binding? |
|---|---|---|
| RPD 1,000 | 100 | no |
| **TPD 200,000** | **~18** (with 15% headroom) | **yes** |

**~18 full generations per day, not the ~85 a request-only model predicts.**
Still an order of magnitude above Gemini's ~1/day, so the A3 throughput argument
holds — but the honest figure is 18, and an earlier draft of this memo said 85.

**One generation exceeds the per-minute token budget.** At 9,426 tokens against
8,000 TPM, a single generation cannot complete inside one minute's allowance.
That is the cause of the HTTP 429s seen on four separate runs under light
single-vertical load — it is a structural consequence of the limits, not
intermittent flakiness, and it will not improve under the corpus run.

**Before the D7 corpus run**, pacing must become token-aware: the spike's fixed
13s `PACE_MS` was sized for Gemini's 5 RPM and does nothing about a token ceiling.
A 10-vertical full corpus is ~94k tokens — inside TPD, but it will hit the TPM
wall repeatedly without it.

---

## What went wrong, and what it does and does not tell us

Four causes consumed the D4 and D5 budgets. **None of them is a generation-quality
failure.** They are why the sample is small, not evidence about the sample.

1. **Recipe schema capped at 7** — my error. A vertical profile is a menu, not a
   page; the page cap belongs on the plan. Fixed.
2. **Two provider 503s** on the strong tier, hours apart. Free-tier availability,
   not our code.
3. **Both configured Gemini models retired** — `gemini-2.5-flash` and
   `-flash-lite` are "no longer available to new users". Fixed in config; no code
   change. Defaults now `gemini-3.5-*`.
4. **Structured output was not enforced on the Groq path.** This is the D5 finding
   and the largest single cause. Moving off Gemini traded `responseSchema` — which
   made an invalid enum impossible — for `json_object` mode, which guarantees valid
   JSON and nothing about its shape. The result was total and reproducible:

   | Run | Result |
   |---|---|
   | `…11-06-06Z-full` | 10 of 10 verticals failed — 9 at `profile` validation, 1 at `groq: HTTP 400` |
   | `…11-53-50Z-full` | `dental-clinic` reached 6 of ~9 calls, then failed at `fillSection(services)` |

   Fixed on D5 by sending real JSON Schema with `strict: true`
   (`gateway/json-schema.ts`), which restores the provider-side guarantee on Groq
   and Cerebras. The Zod `.catch()` fallbacks and the `normalisePlan` repairs stay
   as the safety net rather than the only defence.

   **The fix required a model change, not just a code change.** Groq's
   `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` do **not** support
   `response_format: json_schema` — they return HTTP 400. The `openai/gpt-oss-*`
   models do. Switching to `gpt-oss-120b` / `gpt-oss-20b` is what turned a
   reproducible 10-of-10 failure into 6-of-6 success. The gateway also degrades to
   `json_object` automatically if a model rejects the schema, so a future model
   swap cannot hard-fail the pipeline — it only loses the guarantee, loudly.

5. **Silent classification coercion, now resolved.** On the llama fast tier every
   run logged `classify: coerced tone, palette` — the `.catch()` fallbacks meant
   nothing threw, so classification was silently returning defaults regardless of
   what the user wrote. With enums enforced provider-side, a yoga-studio prompt now
   returns `tone: warm, palette: muted` rather than the `minimal / light` default.
   `.catch()` is right for users and dangerous for evidence; the `coerced` warning
   is what made this visible at all, and should stay.

**The distinction matters more than anything else in this memo.** A day of red
text is not evidence that generation is bad. We have not learned that the copy is
weak; we have learned that we could not measure it. Those lead to opposite
decisions.

---

## Confidence

State what this sample can and cannot support.

**What this sample supports:** that the pipeline completes end to end on a real
provider; that the copy for one no-template vertical is specific and usable; and
that art direction varies appropriately across six business types.

**What it does not support:** a pass rate. The "100%" above is 6 of 6 and is
reported as a count, not a percentage to plan against — one full generation and
five plan-onlys cannot carry AC-F4-1's ≥85% claim. Nor does it say anything about
the *copy* for the five plan-only verticals, which never reached the fill stage.

The 30-vertical corpus at D11 is where a rate becomes meaningful. Do not quote
"100%" in a planning document without the denominator beside it.

One further limit: the quality numbers above all come from Groq's `gpt-oss`
models. Gemini is proven to *serve* (see below) but has not produced a scored
generation, and Cerebras has produced nothing at all.

### Per-provider matrix (D6 Block 5)

| Provider | Model | Full generation | Requests | Model time | Structured output | Coercion |
|---|---|---|---|---|---|---|
| Groq | `gpt-oss-120b` / `gpt-oss-20b` | ✅ complete | 10 | 13.3s | `json_schema` | none |
| Gemini | `gemini-3.5-flash` / `-lite` | plan-only only | 3 | ~9–13s | `response_schema` | none |
| Cerebras | — | ✗ cannot run | — | — | — | — |

Two gaps, stated rather than papered over:

- **Gemini has not completed a full generation.** Its 20 RPD was largely spent on
  the fall-through tests, and a full run needs 10 more. Worth doing on D7 before
  the corpus, since Gemini is now the only backstop.
- **Cerebras cannot be measured at all** while the account is unfunded.

**Groq returned HTTP 429 on four separate runs today** under light single-vertical
load. The cause is now known and is not request volume: at 9,426 tokens a single
generation is 1.2× the 8,000 TPM budget. See *Capacity* above.

### Provider chain — verified end to end

The chain is now **Groq → Gemini**. Cerebras remains supported in code and
configured in `.env.example`, but is out of `AI_PROVIDER_ORDER`.

| Leg | State | Evidence |
|---|---|---|
| Groq | serving | 6 verticals, `…17-32-17Z-full`, `…17-35-22Z-plan-only` |
| Gemini | serving | `…17-43-15Z-plan-only`, reached via forced fallback |
| Cerebras | **unfunded — removed from the chain** | HTTP 402 on every model |

Cerebras was not a code or configuration fault, and the key is not wrong. The
server distinguishes the cases clearly: a fabricated key returns `401 Wrong API
Key`, no key returns `403 Not authenticated`, and **our key returns 200** on `GET
/models` (listing `gpt-oss-120b`, `gemma-4-31b`, `zai-glm-4.7`). Inference then
returns `402 payment_required`, `param: "quota"` — *"Payment required to access
this resource. Visit your billing tab."* — on all three models, with
`x-should-retry: false`.

So the key is valid and the account simply has no inference quota. **Owner action,
not an engineering one.** It was removed from the chain because an unusable
provider in front of a working one costs a wasted round-trip on every call for no
benefit. Re-adding it once funded is a one-line change to `AI_PROVIDER_ORDER`.

The fall-through was proven with live providers before removal: forcing
`AI_PROVIDER_ORDER=cerebras,gemini` produced successful `ngo` and `gym` plans in
which every call was rejected by Cerebras with 402 and served by Gemini, correctly
attributed to `gemini / gemini-3.5-flash` in `raw.json`. That exercises the A3
§5.1 claim — a provider outage advances the chain rather than dropping to a
template — and the evidence stands even though the leg is now out of the chain.

---

## Second decision — the composition architecture

Separate from generation quality. Stage 0 (`fillSection` returns typed fields)
landed on D2 and is not part of this decision.

**Stages 1–4: [ ADOPT | DEFER | DECLINE ]**

Reasoning, and what it means for E2 and E3 next week.

---

## Fallback posture

If quality is below the bar, which lever:

- tighten the plan stage,
- tighten the section contracts,
- or demote generation to P1 and let the template path carry the product.

Name one. "We'll see" is not a posture.

---

## Actions

| Action | Owner | By |
|---|---|---|
| Enable Gemini billing | Adithya | **withdrawn 2026-08-14** — Groq free only |
| Fund the Cerebras account, then add `cerebras` back to `AI_PROVIDER_ORDER` | Hanish | **dropped** — not needed; stays out of the chain |
| Verify `gpt-oss-*` free-tier rate limits on Groq (one 429 seen under light load) | Hanish | D6 |
| Errata: retired model names in §11.11 and §12.6 | Hanish | D6 |
| Close OQ-5 limit values | Hanish + Adithya | D6 |
| A3 §6 Gate 1 — Groq training-data terms, recorded | Hanish | **closed 2026-08-14** — `docs/ai/GATE1_GROQ_TRAINING.md`. Cerebras out of scope. |
| A3 §7 — Gemini billing | Adithya | **withdrawn 2026-08-14** |
| Section components for rendering | Preethi | W2 |
