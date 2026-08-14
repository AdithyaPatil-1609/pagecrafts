# Week 2 — prod-shape generation

Owner: Hanish (R5 · AI). Drafted D5, against the job states in API Design §11.7
so Preethi can build screen 06 against something concrete rather than prose.

## Job states (API §11.7)

```
queued → planning → streaming → validating → [repairing] → done | failed
```

`repairing` is entered at most once per section (BR-09 — a second attempt is a
defect, not a retry). `failed` is reachable only after the template fallback has
also been exhausted; a user who reaches `failed` still leaves with a site.

## SSE events

```
plan · section · validate · repair · done · fallback
```

Emitted in that order. `section` repeats per section; `repair` and `fallback` are
conditional.

## Day by day

**D6 — route and job runner**
`POST /projects/{id}/generate` → 202 + `job_id`. Three counter pre-checks before
any model call: per-request token ceiling, per-user daily quota, shared project
budget (M7.1, Adithya). Job walks the states above. SSE endpoint emits events in
order. Zod gate on every reply.

The per-request token ceiling is already enforced pre-dispatch in the gateway
(`openai-compat.ts`) and raises a non-retryable `validation_failed`, which stops
the provider chain rather than burning it — an oversized prompt fails identically
at every provider.

**D7 — repair and fallback** *(landed: `generate/repair.ts`, `generate/fallback.ts`)*
One repair attempt on validation failure, scoped to the failing section's fields,
with the error as context. On second failure: nearest template via
`rankTemplates`, SSE `fallback` event, user still leaves with a site. 429 backoff
with jitter → `UPSTREAM_LLM_ERROR` past the bound.

Note the fallback is now third in line, not first: a 429 or outage advances the
provider chain (Groq → Gemini; Cerebras out of the order until funded) before the
template path is considered.
See Amendment A3 §5.1.

**D8 — scoped edits**
`POST /edits` returns a patch and writes nothing. `POST /edits/apply` is the only
write path. Separate route directories, not a flag — C-03 is structural, not
conditional.

**D9 — cost logging**
One `generations` row per model call. The row must carry `provider`, `model` and
`promptVersion` — all three are already on `Usage` as of D5. Pricing is per
provider (`ProviderConfig.pricing`); a Groq call must never be costed at Gemini's
rate, or NFR-142's 5% reconciliation cannot hold across three invoices.

The row shape and costing landed on D7 (`src/lib/ai/cost/ledger.ts`) with an
in-memory sink; D9 is persistence only. **Blocker:** `public.generations` exists
but lacks `provider`, `prompt_version`, `latency_ms` and `stage`. An `ALTER TABLE`
from E1 unblocks it.

Token rollups per user per day. Counter reconciliation against Upstash. PostHog
funnel events with category and latency bucket only — never prompt text or tokens.

**D10 — milestone**
Real site under 45s of **model time**; failure path proven by deliberately
breaking it. Note the provider chain shares one overall deadline, so three
providers cannot stack three timeouts against that budget.

## Dependencies

| From | What | By |
|---|---|---|
| Adithya | Upstash counters, kill switch, jobs table | D6 |
| Preethi | Section components, composition renderer | D6 |
| Adhyay | Commit endpoint for auto-commit before edits | D8 |
| Adithya | Gemini billing | D6 |
| Hanish | A3 §6 Gate 1 — Groq training-data terms | **closed 2026-08-14** — `docs/ai/GATE1_GROQ_TRAINING.md` |

## Carried risks

- **Free-tier data policy is now two policies in the live chain.** Groq does not
  train on Inputs/Outputs (Gate 1 closed, `docs/ai/GATE1_GROQ_TRAINING.md`).
  Cerebras is out of the order and was not recorded. Gemini data-use remains
  Adithya's billing item, not this gate.
- **The chain is two legs deep, not three.** Cerebras stays out of
  `AI_PROVIDER_ORDER` — not funding it. A Groq outage falls to Gemini's 20 RPD.
- **Quality evidence is provider-specific.** The D5 go/no-go names one provider and
  one model. Changing `AI_PROVIDER_ORDER` in week 2 silently invalidates it;
  re-run the corpus before relying on the old number.
- **Art-direction diversity is enforced at generation time (D16).** A rolling
  50-site sample restyles a page that would push theme share above ~30% or
  motion above ~40%. D11's 48% `clinical-blue` collapse was the old `applyTone`
  pin (fixed) plus no rolling counter (now `checkAndRecord`).
