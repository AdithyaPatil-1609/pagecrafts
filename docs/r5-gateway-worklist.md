# R5 · Gateway worklist — provider chain hardening

**Context:** the Groq → Cerebras → Gemini chain is built and typechecks clean, but is not ready to commit.
**Branch:** `ai` · uncommitted working tree · **Owner:** Hanish (R5 · AI)
**Decision record:** `docs/amendment-a3-ai-provider-chain.md`

Ordered by risk. **A blocks booting. B breaks stated requirements. C is operational safety. D is tests. E is process.**

---

## A · Blocking — the chain cannot be used as intended

### A1 · A Groq-only setup cannot start

`src/lib/ai/config.ts`

```ts
GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is missing from .env.local'),
```

Gemini's key is still mandatory. So the stated behaviour — *"a provider with no API key is skipped"* — is false for the one provider that is meant to be optional now. Someone with only a Groq key gets a hard config throw.

Worse, the friendly message in `gateway/index.ts`:

```ts
'No AI provider is configured. Set at least one of GROQ_API_KEY, CEREBRAS_API_KEY, or GEMINI_API_KEY.'
```

is **unreachable**. `loadAiConfig()` throws first. Two layers disagree about the same rule.

**Fix**

- `GEMINI_API_KEY: z.string().default('')`
- Keep the "at least one key" check in `build()` as the single place that rule lives
- Add a test: a config with only `GROQ_API_KEY` set loads and builds

### A2 · Gemini model defaults are stale

```ts
GEMINI_MODEL_FAST: z.string().default('gemini-2.5-flash-lite'),
GEMINI_MODEL_STRONG: z.string().default('gemini-2.5-flash'),
```

The D1 `/models` probe on the project key confirmed the 3.5 family. These defaults are the safety net for anyone without a `.env.local`, and they now point a generation behind.

**Fix** — `gemini-3.5-flash-lite` and `gemini-3.5-flash`. Match `.env.example`.

---

## B · Requirement violations

### B1 · Schema constraints are discarded on the OpenAI-compatible path

`src/lib/ai/gateway/openai-compat.ts`

```ts
if (req.schema) {
    body.response_format = { type: 'json_object' };
}
```

`req.schema` is used as a **boolean**. Every enum in it is thrown away — `variant`, section `type`, `themeId`, `motionId`, `radiusId`, `spacingId`, `imageryId`, `category`, `tone`, `palette`.

On Gemini those were enforced by the provider and could not be violated. On Groq nothing enforces them, and the Zod behind them is not built for that:

| Field | Zod today | Behaviour on Groq |
|---|---|---|
| `classification.*` | `.catch()` on every field | safe — degrades |
| `plannedSection.variant` | repaired in `normalisePlan` | safe — repairs |
| `plannedSection.type` | `sectionKeySchema`, hard enum | **whole plan fails** |
| `artDirection.themeId` + 4 others | `z.enum(...)`, hard enum | **whole profile fails** |

**CONFIRMED D5, live against Groq. The failure is worse than predicted and the cheap fix does not work.**

Groq returned, for every one of 10 verticals:

```json
"artDirection": {
    "theme": "clinical-blue", "motion": "calm", "cornerStyle": "sharp",
    "spacing": "default", "photography": "bright-clean"
}
```

Every **value** is correct — identical to Gemini's answers. Every **key** is invented:

| Schema expects | Groq sent |
|---|---|
| `label` | *missing* |
| `recipe[].type` | `section` |
| `recipe[].required: false` | `optional: true` |
| `artDirection.themeId` | `theme` |
| `artDirection.motionId` | `motion` |
| `artDirection.radiusId` | `cornerStyle` |
| `artDirection.spacingId` | `spacing` |
| `artDirection.imageryId` | `photography` |

`.catch()` rescues a wrong **value** in a key that exists. It cannot rescue a key that is absent. **B1a as originally written is void.**

**Fix B1a (revised) — prompt states the shape.** Every prompt that expects structured output must state the literal key names, generated from the registry the same way `variantMenu()` is. On Gemini the `responseSchema` supplied them; nothing supplies them now.

**Fix B1b — PROMOTED TO FIRST. Not a post-Friday item.** Groq and Cerebras both support `response_format: { type: 'json_schema', json_schema: { name, schema, strict: true } }`. Convert the Gemini `Schema` type to JSON Schema and send the real thing. This restores the guarantee lost in the provider move. Prompting alone is not sufficient — the failure was total and reproducible across all 10 verticals.

### B1c · Classification is failing silently on every call

```
classify: coerced tone, palette
classify: coerced category, tone, palette
```

Same root cause at the fast tier. The `.catch()` calls absorb it, so nothing throws — which means classification returns **default values on every request** (`tone: 'minimal'`, `palette: 'light'`) no matter what the user wrote.

The classifier is not working on Groq. It only looks like it is.

**Fix** — same as B1a/B1b. And keep the spike's "coerced" line: `.catch()` is right for users and dangerous for evidence, and that one printed line is what exposed this.

### B2 · No output ceiling

The request body is `{ model, messages }`. There is no `max_tokens`.

FR-103 sets 8,000 in / 4,000 out for generation and 6,000 / 2,000 for scoped edits, and AC-F10-5 requires rejection **before dispatch**, not after. The compat path enforces neither.

**Fix**

- send `max_tokens` from the same tier table the Gemini path uses
- reject a request whose estimated input exceeds `maxRequestTokens` before the `fetch`, with `validation_error` (or the existing ceiling code)

### B3 · Timeouts stack across the chain

Each provider gets its own `AbortSignal.timeout(timeoutFor(req.job))`. Three providers means three timeouts back to back — at 45 s for `generate`, a worst case of **135 s for one call**, against a 45 s P95 requirement (NFR-003).

**Fix** — give `FallbackGateway` one overall deadline for the request and pass the remaining budget to each attempt. Last provider gets whatever is left. Add a test that asserts total elapsed time stays inside the deadline when every provider stalls.

### B4 · Quota, pricing and token ceilings are Gemini's numbers applied to everyone

`AiConfig.quota`, `AiConfig.pricing` and `quota.maxRequestTokens` are all read from `GEMINI_*` and then used globally. Groq's rate limits and prices are different; computing a Groq cost with a Gemini price produces a wrong number that looks like a real one.

NFR-142 requires cost reconciliation within 5% of the provider invoice. That cannot hold with one shared price block.

**Fix** — move `quota`, `pricing` and `maxRequestTokens` into `ProviderConfig`, per provider. Keep the top-level fields as Gemini mirrors for back-compat only if something still reads them; otherwise delete.

### B5 · The reply does not say who served it — **DONE, verify only**

Saved records now carry `usage.provider: "groq"`. Confirm all three gateways set it, then close.

**Still open, same family:** `evals/spike/run.ts` line 12 prints `aiConfig().models` — the Gemini back-compat mirror. Every spike log is headed `{ fast: 'gemini-3.5-flash-lite', strong: 'gemini-3.5-flash' }` while Groq serves every call. Replace with the resolved chain and the provider that answered.

### B5-old · original text

`CompleteReply` carries `model` but not the provider. Groq and Cerebras both host `llama-3.3-70b` under near-identical names, so the model string is not a reliable discriminator.

Every downstream consumer needs this: the cost ledger (M3.8) to attribute spend, the eval harness to label evidence (Amendment A3 §6 Gate 2), and any debugging of a quality regression.

**Fix** — add `provider: Provider` to `CompleteReply`; set it in all three gateways; write it into the spike result records.

### B6 · Failed calls are still not counted

Carried over and still open. The D1 spike recorded `"requests": 2` while the budget decremented by 3 — the failed plan call cost tokens and was never logged.

**Fix** — record usage before validation, not after. A failed call costs money and must appear in the ledger, or NFR-142 reconciliation can never hold.

---

## C · Operational safety

### C1 · A wrong key fails silently, forever

`FallbackGateway` catches everything and advances. A typo in `GROQ_API_KEY` produces a 401, one `console.warn`, and Cerebras quietly serving every request from then on. Nothing is broken, so nobody investigates.

`unauthorized` is a configuration mistake, not an outage.

**Fix** — still fall back, but treat it as a distinct class: warn once with a clear "check this key" message, and add a startup or CI check that fails when a key is present but rejected.

### C2 · Decide which errors advance the chain

Right now every error advances. That is wrong for at least two cases:

- a 400 caused by a malformed request will fail identically at every provider — it burns the whole chain to learn nothing
- a `generation_failed` raised by **downstream Zod validation** correctly does not advance today, because it is thrown outside the gateway. Keep it that way, and write it down: **the chain covers availability, not quality.**

**Fix** — an explicit list of codes that advance the chain (`rate_limited`, retryable `generation_failed`, `unauthorized`) and codes that stop it immediately (`validation_error`, non-retryable request faults).

### C3 · `AI_PROVIDER` is dead config that can contradict `AI_PROVIDER_ORDER`

`AI_PROVIDER` defaults to `groq` and is documented as informational, while `order[0]` is what actually decides. Two knobs, one meaning, able to disagree.

**Fix** — delete `AI_PROVIDER`, or derive it from `order[0]` and stop reading it from env.

### C4 · A garbage provider order degrades silently

`parseOrder` drops unknown tokens and, if nothing survives, returns `['gemini']`. So a typo like `AI_PROVIDER_ORDER=grok,cerebras` silently becomes Gemini-only — the exact configuration this amendment exists to move away from.

**Fix** — warn on every dropped token; make an all-invalid order a startup error rather than a silent default.

### C5 · Confirm the injection envelope survives the new path

The compat gateway builds `messages` straight from `req.system` and `req.user`. Verify that callers still pass envelope-wrapped content and that nothing concatenates the two. BR-25 — *content is data* — is provider-independent and must hold identically on all three paths.

**Fix** — add a test asserting the compat gateway never merges `system` into `user`.

---

## D · Tests to add

| # | Test | Covers |
|---|---|---|
| D1 | Only `GROQ_API_KEY` set → config loads, chain has one provider, no wrapper | A1 |
| D2 | No key at all → clear "set at least one" error from `build()` | A1 |
| D3 | `max_tokens` present in the request body; oversized input rejected before `fetch` | B2 |
| D4 | Every provider stalls → total elapsed stays within one overall deadline | B3 |
| D5 | `provider` is populated on every reply from all three gateways | B5 |
| D6 | `unauthorized` advances the chain **and** emits the config-error warning | C1 |
| D7 | A stop-the-chain code does not attempt provider two | C2 |
| D8 | Invalid `AI_PROVIDER_ORDER` warns per token; all-invalid throws | C4 |
| D9 | Compat gateway never merges `system` into `user` | C5 |
| D10 | Unknown section `type` drops that section; unknown `themeId` falls back — neither throws | B1a |

---

## E · Process — not code, still blocking

| # | Item | Owner | When |
|---|---|---|---|
| E1 | `docs/amendment-a3-ai-provider-chain.md` — written; needs E1 initials on §6 Gate 1 | Hanish → Adithya | Day 2 |
| E2 | Read and record Groq + Cerebras free-tier training-data terms. Any provider that reserves the right to train is development-only and excluded from the production chain by config | Hanish | Before any external user |
| E3 | Go/no-go states the provider and model that produced the number, in one line | Hanish | D5 |
| E4 | Verify default model names against each vendor's live catalogue when keys are added — same lesson as the Gemini 404 | Hanish | At key setup |
| E5 | `.env.example` consistency check — `LLM_MOCK` is the mock switch; make sure no stale `AI_PROVIDER=mock` guidance remains | Hanish | With the commit |
| E6 | Commit. The tree has been uncommitted across two unrelated changes (variant repair + provider chain). Split into two commits so the variant fix is reviewable on its own | Hanish | Today |

---

## Suggested order of execution

Superseded by `docs/r5-d6-d7-schedule.md`, which sequences these items across two days.

Summary of the change after the D5 live run: **B1b is first, not last.** Generation does not work on Groq at all until the schema reaches the provider, so everything downstream of it is blocked.

## Verify

```bash
npm run typecheck && npx vitest run && npm run spike -- --mode=mock
```

**Do not spend live budget on a shape that is known broken.** Three spikes were run against it on D5; all three were always going to fail.
