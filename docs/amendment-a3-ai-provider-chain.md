# Scope Amendment A3 — AI provider chain

**Status:** In force on merge for the provider change. **Gate 1 closed 2026-08-14** (Hanish — Groq terms recorded). **Gemini billing withdrawn 2026-08-14** — production is Groq free (`AI_PROVIDER_ORDER=groq`). Gemini stays in gateway code only if someone lists it.
**Raised by:** Hanish (R5 · AI), Day 2.
**Issued against:** the pre-development documentation pack v2.1, as amended by A1 and A2, and the D5 Capacity Errata.
**Applies to:** Documents 7 (API Design §7.11 / §11.11), 12 (Technology Stack §12.6), 11 (Module Breakdown M3.1), the D5 Capacity Errata, and the R5 / AI role schedule.

---

## 1 · What changes

The AI provider stops being Gemini alone and becomes an ordered chain:

> **Groq → Cerebras → Gemini**

Tried left to right. A provider with no API key is skipped, not attempted. Gemini remains in the chain as the last resort, so nothing that works today stops working.

Nothing else changes. The two-stage pipeline, the fixed layout shells, the C-04 invariant that the model never emits document structure, the injection envelope, the sanitiser and the cost ledger are all untouched. A3 changes **which service answers the call**, not what is asked or what is done with the answer.

## 2 · Why this is an amendment and not an invariant breach

This is a lighter document than A2, and deliberately so.

The pack already designed for this. §11.11 says the provider is *"wrapped by a single `LLMProvider` class so a swap to a paid tier or a different provider is a config change."* §12.6 lists the abstraction as *"provider swappable via config."* PRD §2.8.3 left the model open behind an interface on purpose. M3.1 states the reason in terms: *"Static analysis must show zero direct provider SDK calls outside this module … That is the entire reason it exists."*

So A3 is the gateway doing the job it was built for. **No INVARIANT is being moved.**

What A3 does do is supersede specific named text — the pack names Gemini in several places as though it were settled — and it changes one decision that was signed by someone else: the billing gate at D6. That is why this is written down rather than merged quietly.

## 3 · Why the change is necessary

The D5 Capacity Errata measured Gemini's free tier on the project's own key: **20 requests per day and 5 per minute, per project per model.** One full generation is ~8 requests. That is **~2 generations per day**, shared across five engineers and every beta user.

The errata's conclusion was to enable billing before D6. That conclusion stands, but it solves only the cost dimension. Three problems remain that money does not fix quickly:

1. **The quality plan is still gated on one vendor.** D11 runs a 30-prompt corpus (~210 requests), D12 re-runs it, D15 runs it again, D18 load-tests. A single per-minute ceiling of 5 makes all four slow even when paid.
2. **A single provider is a single point of failure.** §11.11 already acknowledges this — *"a Gemini 429 is expected traffic, not an incident"* — and the answer given was to fall back to the nearest template. Falling back to a *different provider* is strictly better for the user than falling back to a template.
3. **Development throughput.** Five engineers sharing 20 requests a day is why the mock provider exists. A chain with real headroom lets the team develop against real replies.

Groq and Cerebras are both OpenAI-compatible, both offer free tiers with materially higher limits, and both host the same open-weight Llama models. Neither requires a new npm dependency — the wire format is identical, so one `fetch` client covers both.

## 4 · What is being accepted

Stated plainly, because §5 is the mitigation for it.

**Structured output is weaker.** Gemini's `responseSchema` enforced enums at the provider — an invalid `variant`, `themeId` or section `type` was impossible. The OpenAI-compatible path uses `json_object` mode, which guarantees valid JSON and nothing about its shape. Shape is now enforced only by Zod, after the fact.

**Generation quality is a different question per provider.** Evidence gathered against Gemini 3.5 Flash says nothing about Llama 3.3, and vice versa. See §6.

**Cost accounting spans three invoices.** NFR-142 requires reconciliation within 5%. That is harder across three vendors than one, and requires the provider to be recorded on every call.

**Free-tier data policy is now three policies.** See §6.

## 5 · Superseded text and replacements

### 5.1 API Design — §7.11 / §11.11 "AI provider — Gemini, free tier"

| Where | Superseded | Now reads |
|---|---|---|
| Section heading | "AI provider — Gemini, free tier" | "AI providers — Groq, Cerebras, Gemini" |
| Opening decision | "the decision is now made: Google Gemini on the free tier, reached with a free API key from Google AI Studio, wrapped by a single `LLMProvider` class" | "The decision is an ordered chain — Groq, then Cerebras, then Gemini — behind the single gateway in `src/lib/ai/gateway/`. Priority is set by `AI_PROVIDER_ORDER`; a provider with no key is skipped. Gemini remains the last resort, not the default." |
| Model split table | Three rows naming Gemini 2.5 Flash / Flash-Lite per job | The fast/strong split is unchanged in shape. Model names per provider live in config (`*_MODEL_FAST`, `*_MODEL_STRONG`) and are verified against each vendor's live catalogue, never written in code. |
| 429 handling | "if it still fails it surfaces `UPSTREAM_LLM_ERROR`, and generation falls back to the nearest template" | "A 429 or outage advances the chain to the next provider. Only when every configured provider has failed does the request surface `generation_failed` and generation fall back to the nearest template. The template fallback is now the third line of defence, not the first." |

### 5.2 Technology Stack — §12.6 "AI / LLM"

| Where | Superseded | Now reads |
|---|---|---|
| Provider | "Google Gemini — free tier (Google AI Studio key)" | "Groq (primary) · Cerebras (secondary) · Google Gemini (last resort). Selection and priority by config." |
| Generation model | "Gemini 2.5 Flash" | "Per-provider `*_MODEL_STRONG`. Defaults recorded in `.env.example`; verified against the vendor catalogue at key setup." |
| Classification model | "Gemini 2.5 Flash-Lite" | "Per-provider `*_MODEL_FAST`, same rule." |
| Scoped-edit model | "Gemini 2.5 Flash" | "Per-provider `*_MODEL_STRONG`, same rule." |
| Abstraction | "`LLMProvider` interface — provider swappable via config (two-tier)" | "`Gateway` / `NamedGateway` in `src/lib/ai/gateway/`. `FallbackGateway` composes the chain. `OpenAICompatGateway` serves any OpenAI-compatible vendor; `GeminiGateway` serves Gemini's native SDK. NFR-042 is unchanged and now applies per provider: no vendor SDK or endpoint may be reached from outside this directory." |

### 5.3 Module Breakdown — M3.1 Model Gateway

| Where | Superseded | Now reads |
|---|---|---|
| Description | "The one place the provider SDK is imported." | "The one place any provider is reached. One vendor-native gateway (Gemini), one OpenAI-compatible gateway (Groq, Cerebras and any future compatible vendor), and a fallback composer that tries them in configured order." |
| Sub-components | "tier router (fast / strong) · request builder …" | Unchanged, plus: "provider chain composer · per-provider `configured` check · cross-provider fault normalisation." |
| Rule | "Phase 2C — routing easy generations to a fine-tuned model — is a change inside this module and nowhere else." | Unchanged, and now demonstrated: adding two providers touched no file outside `src/lib/ai/gateway/` except config and `.env.example`. |

### 5.4 D5 Capacity Errata

The three measured figures are **unchanged and still correct for Gemini**. What changes is what follows from them.

| Where | Superseded | Now reads |
|---|---|---|
| "Billing must be enabled before D6, not D18–19 … Owner: Adithya." | Gemini billing is the only route to a runnable quality plan | **Withdrawn 2026-08-14.** Groq free carries D11–D18. Gemini is not in `AI_PROVIDER_ORDER`. Gate 1 is Groq terms, not a Google invoice. |
| R-NEW · "Free-tier request ceiling makes the quality plan unexecutable — L5 × I4 = 20 · High" | — | "Likelihood reduced to L2 by A3; the ceiling is routed around rather than removed. Impact unchanged. New residual risk R-NEW-2: **three free tiers, three data-use policies** — see §6." |

## 6 · The two gates

**Gate 1 — training-data policy. Blocking before any external user. Owner: Hanish.**

The PRD promises the user's site content is *never used for training*. The free-tier argument that forced Gemini billing forward applies to every provider in the chain: terms must be read and recorded before a real user's content is sent. If a free tier reserves the right to train, that provider is development-only and must be excluded from the production chain by config.

**Solving a quota problem must not import a privacy problem.** This gate is why A3 does not withdraw the billing decision, only re-labels its reason.

**Closed on 2026-08-14 by Hanish.** Record: `docs/ai/GATE1_GROQ_TRAINING.md`. Groq's Services Agreement §4.2 does not permit using Inputs or Outputs to train or fine-tune models unless the customer grants permission. The same agreement covers fee-free Developer usage (§5.1). Groq stays at the head of `AI_PROVIDER_ORDER`. Cerebras is out of the chain and out of this record — a terms check must land before it is added back. E1 initials are not required; this is a provider-terms record, not the Gemini billing gate.

**Gate 2 — the go/no-go must name the provider. Owner: Hanish, D5.**

"Generation quality is good enough" is a claim about a specific model. Any go/no-go must state, in one line, which provider and which model produced the number, and the eval record must carry the provider on every call.

Without that line, someone changes `AI_PROVIDER_ORDER` in Week 3 and the go/no-go silently stops being true.

**Closed on D6.** Every call in `raw.json` now carries `provider`, `model`, `promptVersion` and `structuredOutput`. The D5 evidence is labelled:

> Groq · `openai/gpt-oss-120b` (strong) / `openai/gpt-oss-20b` (fast) · prompts `v1` · `json_schema`

The attribution is per call rather than per run, which matters more than expected: a Groq 429 mid-generation moved the `plan` stage to Gemini, and the record shows the switch rather than averaging over it.

**Operational note (D6, updated 2026-08-14):** the chain in force is **Groq only**. Gemini billing is withdrawn; Gemini is not in the default `AI_PROVIDER_ORDER`. Cerebras remains in the gateway code but stays out of the order — unfunded, and Gate 1 was not recorded for it. Adding either back is a §5.1 config change plus a terms re-read, not a default.

## 7 · Sign-off

A3 §1–§5 take effect on merge; no INVARIANT is moved and the gateway abstraction was designed for exactly this.

§6 Gate 1 is a terms record on the provider in the chain. It is owned and closed by R5. Gemini billing is withdrawn — Groq free is the production path.

| Role | Name | Position | Date |
|---|---|---|---|
| R5 · AI | Hanish | Gate 1 closed — Groq recorded, Cerebras out of scope | 2026-08-14 |
| Product Owner | | | |

---

*Related: Amendment A1 (platform-managed publishing), Amendment A2 (authentication model), D5 Capacity Errata, D5 Repository Layout Errata.*
