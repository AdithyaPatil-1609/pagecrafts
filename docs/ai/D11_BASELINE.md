# R5 · AI — D11 quality baseline

Owner: Hanish (R5 · AI). The corpus, the grader and the ranking machinery for the
30-vertical quality pass.

> **Status: measured.** `evals/grader/results/2026-08-14T05-13-47-751Z-baseline-full/`
>
> Groq · `openai/gpt-oss-120b` (strong) / `openai/gpt-oss-20b` (fast) · prompts `v1` · `json_schema`.
> Auto pass **28/30 (93%)**. Diversity **fails** (`clinical-blue` / `whisper` at 48%).
> Human columns fully read: copy **3.20**, sections **3.90**, art **3.63**. Copy ≥4 on 13/30.

---

## The capacity gate, restated

The schedule's errata puts a hard gate before D11: Gemini billing, or the corpus
shrinks to ~2 verticals and the *90% of 30* metric is renegotiated.

**That arithmetic is against the wrong provider.** `AI_PROVIDER_ORDER` is
`groq,gemini` — Gemini is the *last* fallback, not the head of the chain. The
gate is real but much softer than written:

| | Requests/day | Tokens/day | Full generations/day | Binding limit |
|---|---|---|---|---|
| **Groq free** (head of chain) | 1,000 | 200,000 | **18** | tokens/day |
| Gemini free (final fallback) | 20 | — | ~1–2 | requests/day |

One measured generation is ~10 requests and ~9,426 tokens (D5 spike, `analyse()`
in `evals/spike/analysis.ts`). At 15% headroom that is **18 generations a day on
the free tier we are already using**.

The whole three-day programme, in generations rather than requests:

| Block | Generations | Days on Groq free |
|---|---|---|
| D11 corpus, 30 verticals | 30 | 1.7 |
| D11 targeted re-run after quick wins | ~5 | 0.3 |
| D12 regression re-run, all 30 | 30 | 1.7 |
| D12 sampling sweep (plan-only, 6 verticals × 6 configs) | ~18 equivalent | 1.0 |
| D13 injection corpus | 0 | 0 — runs offline, see below |
| **Total** | **~83** | **≈ 5 days** |

**So D11 can run at the full 30 verticals without billing**, over about two days,
and the *90% of 30* metric does not need renegotiating. Billing is still worth
having — it collapses five days of waiting into an afternoon, and at the
amendment's pricing the whole programme is a bit over a dollar — but it is a
convenience, not a gate. The D5 escalation should be re-framed on that basis
rather than as a blocker.

Two further corrections to the errata's arithmetic:

- **The binding limit on Groq is tokens/day, not requests/day.** A request-only
  model predicts 85 generations a day and is wrong by a factor of nearly five.
  `tests/unit/ai/capacity-analysis.test.ts` pins this.
- **D13 costs nothing.** The injection corpus is graded against our own
  containment, sanitiser and patch construction, all of which are deterministic.
  It runs in CI on every PR with no provider. The errata budgeted ~40 requests
  for it; the real figure is zero.

---

## What landed

| File | What it is |
|---|---|
| `evals/corpus-30.json` | 30 verticals: 18 with no template, 8 with, 2 adversarial, 2 non-Latin-script |
| `evals/grader/index.ts` | Objective grade per vertical, and the human sheet |
| `evals/grader/diversity.ts` | R-NEW-C — art-direction spread across the corpus |
| `evals/grader/taxonomy.ts` | Failure clustering, ranked by count × impact |
| `evals/grader/adapt.ts` | Pipeline result → graded outcome, deriving `failureStage` |
| `evals/grader/run.ts` | `npm run grade` |

```bash
npm run grade
```

`--mock` runs the whole thing with no provider (useful for checking the harness,
useless for measuring quality). `--only=v03,v07` re-runs named verticals, which
is what the "quick wins, re-run affected verticals only" block needs.
`--budget=N` caps provider calls and stops cleanly rather than eating a day's
quota.

### Corpus composition

Eighteen of thirty is not a representative sample of businesses. It is a
representative sample of *the thing that might not work* — a vertical with no
hand-authored template to fall back on. The eight with templates are the control
group, so the report is two numbers rather than one: without them, "we got 73%"
says nothing about whether the hard cases are the ones failing.

`expect.mustHave` / `shouldNotHave` are what make section appropriateness partly
automatic. A dentist's site with a `menu` section is wrong and a machine can say
so.

**`expect.category` is a list, not a single value.** The category enum ships
genuine synonyms — `health`, `healthcare`, `health_wellness`, `wellness` — and
grading a dentist wrong for answering `healthcare` instead of `other` would be a
measurement defect, not a finding. Same class of error as the D8 P95 figure that
was counting pacing as provider time.

### Three grading rules

- **`completed` is not `passed`.** AC-F4-1 asks for valid, non-blank, *without
  fallback*. A vertical that fell back to a template finished and failed the
  quality bar. Two columns, never one.
- **Human rows default to `null`.** `summariseHuman()` refuses to average a
  partly-read column and reports the unread count instead. Thirty rows and an eye
  on the clock is exactly when a `3` gets typed for something nobody read.
- **`failureStage` is required on every failure.** The type makes it impossible
  to construct a failed outcome without one, so the compiler enforces it rather
  than a reviewer. "Generation is flaky" is not actionable; "eleven of thirty
  failed at fill on list-heavy sections" is.

`categoryCorrect` and `variantsDistinct` are reported but deliberately do **not**
gate `passed` — a right-looking page filed under a defensible neighbouring
category is not a product failure.

---

## A defect found while building this, and fixed

The classify contract validated against **17 categories while the type, the
prompt and the provider schema all carried 38**. `satisfies z.ZodType<Category>`
does not catch a *narrower* enum, so it drifted silently as the library grew.

The effect: 21 of 38 categories — `healthcare`, `beauty`, `real_estate`,
`retail`, `finance`, `personal` and fifteen more — were offered to the model,
accepted by the provider schema, and then **silently rewritten to `other`** by
`classification`, which also set `fallback: true` on the result.

That is not a small measurement wrinkle. Most of this corpus is health, trade and
retail verticals; a baseline taken before the fix would have shown
`wrong-category` at the top of the taxonomy for a reason that has nothing to do
with any prompt, and D12 would have spent its one tuning slot chasing it.

It was **already biting**: `tests/unit/ai/corpus.test.ts` was failing on `main`
for exactly this reason before any of this work started.

Fixed by making `CATEGORY_IDS` in `src/lib/contracts/template.ts` the single
list, with exhaustiveness checks in both directions, and deriving the contract
validator, the prompt's offer list and the provider schema from it. The test that
pinned the stale seventeen now pins the invariant instead.

---

## Results

Evidence: `evals/grader/results/2026-08-14T05-13-47-751Z-baseline-full/summary.json`.
Ran 2026-08-14 in two sessions on Groq free (15 + 15 resume). Prompts stayed on **v1**.

### Pass rate

| Group | Passed | Total | Rate |
|---|---|---|---|
| Overall | 28 | 30 | **93%** |
| **No template** (corpus group — the claim under test) | 18 | 18 | 100% |
| Template (control) | 7 | 8 | 88% |
| Adversarial | 1 | 2 | 50% |
| Non-Latin-script | 2 | 2 | 100% |

The two auto-fails: **`unspecified` (v27)** died at fill (`fillSection(testimonials)` schema rejection — no page). **`event` (v22)** completed but missed required `contact`. `driving-school` passed with a wrong category (`professional_services`); that does not gate `passed`.

The published D15 bar is 90% of 30. The **machine** bar is met. Diversity fails. Human copy ≥4 is **13/30 (43%)** — that is not the same bar.

### Diversity — R-NEW-C

Thresholds: no theme above 30% of the corpus, no motion above 40%. Measured on 29 completed compositions (v27 produced none).

| Metric | Value | Limit |
|---|---|---|
| Dominant theme share | **clinical-blue 48%** | ≤ 0.30 |
| Dominant motion share | **whisper 48%** | ≤ 0.40 |
| Distinct variant sets | 25/29 | — |

**FAILS.** This is the headline finding, not the 93% pass rate. Fourteen of twenty-nine pages share `clinical-blue` / `whisper` — hospital, law-firm, dental, vet, SaaS, event, university, and more. A product where half the businesses get the same look has a problem a good pass rate conceals. D12's remaining slot after the two auto-fails is art direction, not more section contracts.

### Failure clusters

Ranked by count × impact. **The top three go into D12 and nothing else does.**

| # | Stage | Symptom | Count | Verticals |
|---|---|---|---|---|
| 1 | fill | generic-copy | 3 | law-firm, ngo, personal |
| 2 | fill | schema-rejection | 1 | unspecified |
| 3 | plan | missing-required-section | 1 | event |

v3 prompts target (2) and (3) and are now the default after D12's clean six-run. (1) is the human-sheet finding: placeholder contact and wrong job-of-the-page, not a machine blank.

### Human columns

Scored by reading `human-read/*.md` from `raw.json`. Sheet: `human-sheet.json`.

| Column | Mean | ≥4 | ≤2 |
|---|---|---|---|
| copySensible | **3.20** | 13/30 | 6 |
| sectionSelectionAppropriate | **3.90** | 22/30 | 5 |
| artDirectionAppropriate | **3.63** | 18/30 | 11 |

Copy ≥4 is the human pass used in the spike rubric. **13/30 (43%)**. Sections are mostly apt; art is dragged down by `clinical-blue` on law, logistics, driving school, packers, RWA, electrician, accountant, SaaS, event, university.

D15 remeasured the same 30 on **v3** (not this v1 sheet): copy ≥4 is **28/30** in `evals/grader/results/2026-08-14T07-58-07-237Z-d15-sensible-full/`. The two misses are v21 (invented 1-800) and v29 (Hindi name not on the hero). Do not mix the two sheets.

### Spend

| | Requests | Tokens |
|---|---|---|
| Baseline run | 316 | 359,729 |

---

## Ordering note for whoever runs this

D13's containment envelope (`src/lib/ai/containment/`) is **already wired into
every generation call site**, so the text reaching the provider now carries a
`<data-nonce>` boundary and a containment paragraph that the D5 and D8
measurements did not have.

That is a change to the effective prompt, and it landed before the baseline was
taken rather than after. It is the right order — containment is what ships, so
the baseline should measure what ships — but it does mean **the D11 figures are
not comparable to the D5/D8 numbers.** Do not put them in the same table.

---

## Carried forward

| Item | Why |
|---|---|
| Diversity — `clinical-blue` / `whisper` at 48% on the v1 30 | v3 30 **passes** (clinical-blue 23%, calm 40%) — `2026-08-14T07-58-07-237Z-d15-sensible-full` |
| Human copy ≥4 only 13/30 on the v1 sheet | v3 30: **28/30**. Remaining: v21 invented phone, v29 Hindi not on the hero |
| A clean NFR-003 P95 | Still owed from D8 — both existing figures included pacing |
| `vertical_profiles` table | Migration written (`20260812090000`); needs provisioning by E1 |
