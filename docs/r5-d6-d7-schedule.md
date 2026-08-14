# R5 · AI — working schedule, D6 and D7

**Owner:** Hanish (R5 · AI) · **Week 2, "Core loop"**
**Week-2 deliverable (Timeline §17.2):** *"Generation prod-shape; scoped edits; cost logging. A prompt produces a real site in under 45 s; failure path proven by deliberately breaking it."*
**Milestone:** D10 — core loop closed.

**State at end of D5:** the Groq → Cerebras → Gemini chain is built and typechecks, but **generation does not work on Groq**. Profile fails validation on all 10 verticals and classification silently returns defaults on every call. Cause is known and total: the JSON schema never reaches the provider.

So D6 is a repair day, not a feature day. D7 is the feature day.

---

## Outcome — what actually happened

**D6 and D7 are complete**, with four deviations from the plan as written:

1. **B1b needed a model change, not just a converter.** Groq's `llama-3.3-70b-versatile`
   and `llama-3.1-8b-instant` reject `response_format: json_schema` with HTTP 400.
   The `openai/gpt-oss-*` models accept it. Switching to `gpt-oss-120b` / `-20b` is
   what turned the 10-of-10 failure into success. The gateway also degrades to
   `json_object` automatically if a model rejects the schema, so a future model swap
   cannot hard-fail — it loses the guarantee loudly instead.

2. **Cerebras is out of the chain.** The key is valid (`GET /models` → 200; a fake
   key gives 401) but the account has no inference quota — HTTP 402 `param: "quota"`
   on every model. The chain is **Groq → Gemini**. Re-adding it is one line in
   `AI_PROVIDER_ORDER` once funded, so the D6 exit condition's "each of the three
   providers" cannot be met and was not.

3. **The 429s were structural, not flaky.** Groq's published free-tier limits are
   30 RPM · 1,000 RPD · **8,000 TPM · 200,000 TPD**. A full generation is ~9,426
   tokens — 1.2× the per-minute budget on its own. Capacity is therefore **~18 full
   generations/day** (token-bound), not the ~85 a request-only model predicts.
   Pacing moved into the gateway (`gateway/rate-limit.ts`) and is token-aware; the
   old fixed 13s `PACE_MS` between verticals could never have helped, because the
   budget is exceeded *within* a single generation.

4. **B4 and B6 landed on D6, not D7** — they were prerequisites for trustworthy
   evidence rather than follow-on work.

The per-provider matrix in Block 5 is two rows, not three, for reason 2 above.

---

# D6 — make the chain trustworthy

**One sentence goal:** a full generation completes on Groq for one vertical, and the saved evidence names the provider that produced it.

No new features. Nothing from Week 2's feature list is started today.

## Block 1 · 09:00–10:00 — boot correctness

Worklist **A1, A2**, and the misleading banner.

| Item | File | Why now |
|---|---|---|
| A1 · `GEMINI_API_KEY` optional | `src/lib/ai/config.ts` | A Groq-only setup cannot start today. Contradicts the stated skip rule. |
| A2 · Gemini defaults → 3.5 | `src/lib/ai/config.ts`, `.env.example` | Defaults still point at 2.5, a generation behind the D1 probe. |
| Banner | `evals/spike/run.ts:12` | Prints Gemini model names while Groq serves. Actively misleading evidence at the top of every log. |
| B5 verify | all three gateways | `usage.provider` is already saved. Confirm all three set it, then close the item. |

**Check**

```bash
npm run typecheck
npx vitest run tests/unit/ai-config.test.ts tests/unit/ai/gateway-build.test.ts
```

## Block 2 · 10:00–13:00 — B1b, the JSON Schema converter

**The blocking item.** Everything else today waits on it.

Write `src/lib/ai/gateway/json-schema.ts`: convert the Gemini `Schema` type to JSON Schema, and send it as

```ts
response_format: {
  type: 'json_schema',
  json_schema: { name: '<job>', schema: <converted>, strict: true },
}
```

Cover what your schemas actually use: `OBJECT` with `properties` / `required`, `ARRAY` with `items`, `STRING` with `enum`, `BOOLEAN`. Nothing more — do not write a general converter for a spec you do not use.

Keep `json_object` as the fallback when a provider or model rejects `json_schema`, and record which mode was used on the reply so a quality difference is traceable.

**Check** — pure unit work, no live calls

```bash
npx vitest run tests/unit/ai/openai-compat.test.ts
```

New tests: every schema in `response-schemas.ts` converts without throwing; enums survive the conversion; `strict: true` is set; the `json_object` fallback triggers on a simulated 400.

## Block 3 · 14:00–15:00 — prompts state their own shape

Worklist **B1a (revised)** and **B1c**.

Even with `json_schema` sending the shape, the prompt should state it. Belt and braces, and it is what keeps `json_object` fallback usable.

- profile prompt: literal key names for `label`, `aliases`, `recipe[].type` / `.required` / `.note`, the five `artDirection` ids, `vocabulary`, `imageQueries`
- classify prompt: the allowed `category`, `tone`, `palette` values
- **generate every list from the registry**, the way `variantMenu()` does. No hand-written second copy — that is what broke `npm run prompt` yesterday.

While here, apply the C-fix from D5: `render()` should merge a shared registry-vars object automatically, so adding a `{{...}}` to a template cannot break a caller that does not know about it.

**Check**

```bash
npm run prompt profile.v1 vertical=dental-clinic prompt="family dental clinic in koramangala"
npm run prompt plan.v1 vertical=dental-clinic prompt="family dental clinic in koramangala"
```

## Block 4 · 15:00–16:00 — prove it, cheaply first

```bash
npm run typecheck && npx vitest run && npm run spike -- --mode=mock
```

Mock green first. **Then** one live call, one vertical:

```bash
npm run spike -- --mode=plan-only --only=dental-clinic --budget=3
```

Read the saved record, not the console:

```bash
D=$(ls -t evals/spike/results | head -1)
cat evals/spike/results/$D/raw.json | jq '.[0] | {vertical, ok, error, calls: [.calls[] | {stage, provider, model}]}'
```

**Pass condition:** profile parses, plan parses, and no `coerced` line appears on classify.

If classify still coerces, stop and fix that before spending anything further — a classifier returning defaults makes every downstream stage meaningless.

## Block 5 · 16:00–17:00 — the per-provider matrix

Now the same generation on each provider. This is the test set that did not exist before the chain.

```bash
# one at a time — set in .env.local, confirm with the chain check, then run
AI_PROVIDER_ORDER=groq       → npm run spike -- --mode=full --only=dental-clinic --budget=10
AI_PROVIDER_ORDER=cerebras   → npm run spike -- --mode=full --only=dental-clinic --budget=10
AI_PROVIDER_ORDER=gemini     → npm run spike -- --mode=full --only=dental-clinic --budget=10
```

Record for each: did it complete, how many requests, model time, wall clock, which model, and any `coerced` or `repaired` lines. One table, committed.

Also settle the **HTTP 400 on the `photography` vertical** from D5 — its detail was never written. Re-run that one vertical and read the saved detail.

## Block 6 · 17:00–17:30 — write it down

- Update `docs/amendment-a3-ai-provider-chain.md` §6 Gate 2 with the provider/model actually used
- Post the per-provider table in the team channel
- Two commits: the variant-repair work, then the provider chain (worklist E6)

## D6 exit condition

> One vertical generates end to end on **each** of the three providers. The saved record names the provider on every call. Classification returns real values, not coerced defaults. Mock spike, typecheck and full test suite are green.

If that is not true at 17:30, **D7 does not start** — carry the remainder and say so, rather than building features on a chain that does not work.

---

# D7 — prod shape, cost, and the corpus

**One sentence goal:** the failure path is proven deliberately, every call is costed, and the 30-prompt corpus runs for the first time.

## Block 1 · 09:00–10:30 — B6 and the cost ledger (M3.8)

**B6 first.** Usage must be recorded **before** validation, not after. D1 evidence: the spike logged `requests: 2` while the budget decremented by 3 — a failed call cost tokens and vanished.

Then wire M3.8 properly:

- one row per model invocation — classify, profile, plan, fill, edit — success **or** failure
- columns include `provider`, `model`, `input_tokens`, `output_tokens`, `cost_cents`, `status`
- **B4 belongs here**: `pricing` and `quota` are currently Gemini's numbers applied to all three providers. Move them into `ProviderConfig`. Groq's price applied from Gemini's table is a wrong number that looks real, and NFR-142 requires reconciling to within 5% of the invoice.

**Check**

```bash
npx vitest run tests/unit/ai
npm run spike -- --mode=mock    # every mock call produces a ledger row
```

## Block 2 · 10:30–12:30 — the failure path, on purpose

Week 2's exit condition is not "it works". It is *"failure path proven by deliberately breaking it"*.

Four breakages, each with a test:

| Break | Expected | Requirement |
|---|---|---|
| Model returns invalid shape twice | exactly **one** repair attempt, then nearest-template fallback | BR-09, FR-044/045 |
| Groq returns 429 | chain advances to Cerebras, user sees nothing | A3 §5.1 |
| All three providers fail | one aggregate error, template fallback, real message — never a bare 500 | Week 3 exit condition |
| Request exceeds the token ceiling | rejected **before** dispatch | FR-103, AC-F10-5 |

The last one is worklist **B2** — the compat path still sends no `max_tokens` and enforces no input ceiling. Do it here.

Also **B3** here: per-provider timeouts currently stack. Three providers at 45 s is a 135 s worst case against a 45 s requirement. Give `FallbackGateway` one overall deadline and pass the remaining budget down.

## Block 3 · 13:30–15:00 — the 30-prompt corpus

This is what the provider change was **for**. On Gemini's free tier this run was impossible — ~210 requests against a ceiling of 20. On Groq it is affordable.

```bash
npm run spike -- --mode=full --budget=250
```

Score it. The bar from the pack is **≥85% produce a valid non-blank site without fallback, 100% produce either a site or a fallback**.

Expect the corpus to be 10 verticals today, not 30. If so, that is a finding to state plainly: the D11 target needs 30, and the corpus has to grow before then. Say it now, not on D11.

## Block 4 · 15:00–16:30 — scoped edits (M3.5)

The last untouched Week-2 deliverable. `src/lib/ai/edit/propose.ts` exists; make it real on the new chain.

Rules that do not bend:

- **no write path of any kind** — not disabled, not guarded, absent (C-03)
- one instruction, exactly one target file (FR-067)
- sanitise before it is **rendered**, not just before it is applied — a rejected proposal is still shown to a human (FR-066)
- returns a diff; only a separate accept call touches the file system

**Check**

```bash
npx vitest run tests/unit/ai
npm run spike -- --mode=mock
```

## Block 5 · 16:30–17:30 — go/no-go v2

The Week-1 go/no-go was evidence about Gemini. The product now runs on Groq. Reissue it.

One page, in `docs/`:

- the provider and model that produced the number, named in the first line (A3 §6 Gate 2)
- pass rate over the corpus, with the corpus size stated honestly
- model time and wall clock, separately — the D1 measurement showed 5.6 s model against 11.7 s wall, and on a paced tier those are different questions
- per-provider comparison table from D6 Block 5
- the recommendation, and what would change it

Plus **E2 from the worklist** (A3 §6 Gate 1): read and record Groq's free-tier training-data terms. **Closed 2026-08-14** — `docs/ai/GATE1_GROQ_TRAINING.md`. Groq does not train on Inputs/Outputs. Cerebras is out of the chain and was not recorded. Any provider that later reserves the right to train on user content is development-only and must be excluded from the production chain by config.

## D7 exit condition

> A prompt produces a real site in under 45 s of model time. The failure path has been proven by deliberately breaking it, four ways. Every call — successful or failed — produces a cost row naming its provider. The corpus has run and been scored. Scoped edits propose a diff and cannot write.

---

# Test checklist — updated for three providers

## Runs on every change, free

```bash
npm run typecheck
npm test
npm run lint
npm run spike -- --mode=mock
```

## AI slice, fast loop

```bash
npx vitest run tests/unit/ai
npx vitest run tests/unit/ai-config.test.ts
npx vitest run tests/unit/ai/openai-compat.test.ts
npx vitest run tests/unit/ai/fallback-gateway.test.ts
npx vitest run tests/unit/ai/gateway-build.test.ts
npx vitest run tests/unit/ai/composition-rules.test.ts
npx vitest run tests/unit/ai/schemas.test.ts
```

## Tests to add — provider-aware

| # | Test | Day |
|---|---|---|
| P1 | Only `GROQ_API_KEY` set → config loads, chain of one, no wrapper | D6 |
| P2 | No key at all → clear "set at least one" error from `build()` | D6 |
| P3 | Every schema in `response-schemas.ts` converts to JSON Schema without throwing | D6 |
| P4 | Enums survive conversion; `strict: true` is set | D6 |
| P5 | `json_object` fallback triggers on a simulated `json_schema` rejection | D6 |
| P6 | All three gateways populate `provider` on the reply | D6 |
| P7 | Compat gateway never merges `system` into `user` (BR-25) | D6 |
| P8 | `max_tokens` sent; oversized input rejected before `fetch` | D7 |
| P9 | Every provider stalls → total elapsed within one overall deadline | D7 |
| P10 | `unauthorized` advances the chain **and** emits a config-error warning | D7 |
| P11 | A stop-the-chain code does not attempt provider two | D7 |
| P12 | Invalid `AI_PROVIDER_ORDER` warns per token; all-invalid throws | D7 |
| P13 | Exactly one repair attempt, never two (BR-09) | D7 |
| P14 | All providers failing yields one aggregate error and a template fallback | D7 |
| P15 | Failed calls produce a ledger row with non-null token counts | D7 |
| P16 | Per-provider pricing is used, not Gemini's for everyone | D7 |

## Live checks — these spend quota

Order matters. Never go down this list until the one above it passes.

```bash
# 1 · which provider will answer
npx tsx --env-file=.env.local -e "import('./src/lib/ai/config.ts').then(m=>{const c=m.loadAiConfig();console.log('order:',c.order.join(' -> '));for(const p of c.order)console.log(' ',p,c.providers[p].apiKey?'KEY SET':'no key')})"

# 2 · model names still valid — free, not inference
set -a; source .env.local; set +a
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" | jq -r '.data[].id' | sort
curl -s https://api.cerebras.ai/v1/models -H "Authorization: Bearer $CEREBRAS_API_KEY" | jq -r '.data[].id' | sort

# 3 · cheapest live check
npm run spike -- --mode=plan-only --only=dental-clinic --budget=3

# 4 · one full generation
npm run spike -- --mode=full --only=dental-clinic --budget=10

# 5 · per-provider matrix — one at a time via AI_PROVIDER_ORDER
# 6 · the corpus, D7 only
npm run spike -- --mode=full --budget=250
```

Always read the saved record, never the console — the console truncates:

```bash
D=$(ls -t evals/spike/results | head -1)
cat evals/spike/results/$D/raw.json | jq '.'
```

---

# What this does to the rest of the team

| Person | Effect |
|---|---|
| **E1 · Adithya** | Gate 1 does not need his initials — closed by Hanish on Groq alone (`docs/ai/GATE1_GROQ_TRAINING.md`). Gemini billing remains his. His rate limiter and spend cap count the providers in the live chain. |
| **E2 · Frontend** | Unchanged. The AI-edit view is built against the diff contract, which the provider move does not touch. Confirm scoped edits still propose-only before their Week-3 chat work. |
| **E3 · Discovery** | Classification returning coerced defaults means their gallery ranking has been receiving `tone: 'minimal'` for every user. Tell them today — their filters may look broken for reasons that are not theirs. |
| **E5 · Backend** | Generation timing changes with the provider. Their job runner and polling intervals were sized against Gemini. Share the D6 per-provider table. |

**The one message to send today:** classification has been silently returning defaults on every call since the provider switch. E3 is affected and does not know.
