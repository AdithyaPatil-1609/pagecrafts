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

**D7 — repair and fallback**
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
| Adithya | Gemini billing | **D6, blocking** |
| Hanish | A3 §6 Gate 1 — free-tier training-data terms for Groq and Cerebras | before any external user |

## Carried risks

- **Free-tier data policy is now three policies.** Any provider whose free tier
  reserves the right to train on submitted content is development-only and must be
  excluded from the production chain by config. Unresolved until Gate 1 is signed.
- **The chain is two legs deep, not three.** Cerebras is unfunded (HTTP 402) and
  out of `AI_PROVIDER_ORDER`, so a Groq outage falls straight to Gemini's 20 RPD.
  Until Cerebras is funded or Gemini billing lands, the redundancy A3 was written
  to buy is thinner than it reads.
- **Quality evidence is provider-specific.** The D5 go/no-go names one provider and
  one model. Changing `AI_PROVIDER_ORDER` in week 2 silently invalidates it;
  re-run the corpus before relying on the old number.
- **Art-direction diversity is unverified.** If D11 shows themes collapsing across
  verticals, the fix is in the `profile` prompt and lands at D12.
