# R5 · AI — D11 quality baseline

Owner: Hanish (R5 · AI). The corpus, the grader and the ranking machinery for the
30-vertical quality pass.

> **Status: run, and capacity-limited rather than quality-limited.**
>
> The corpus ran against Groq on 2026-08-12. **9 of 30 verticals completed the
> pipeline; 7 of those 9 passed.** The other 21 never produced a page: the run
> consumed 195,358 tokens against Groq's 200,000/day ceiling and the provider
> stopped serving.
>
> **The 30% figure is not a quality result and must not be quoted as one** — 21
> of the 30 are provider exhaustion, not bad output. The quality signal is the
> 7 of 9, and it comes with one real defect: see "The defect reading found".

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

## What the run actually measured

Run: `2026-08-12T18-00-38-385Z-baseline-full` · 163 requests · 195,358 tokens ·
provider chain `groq,gemini`, prompts at v1.

| | Count |
|---|---|
| Verticals attempted | 30 |
| **Completed the pipeline** | **9** |
| Of those, passed | **7 (78%)** |
| Of those, correct category | 9 |
| Of those, carrying an unfilled placeholder | **2** |
| Of those, blank fields | **0** |
| Of those, missing required sections | **0** |
| Of those, forbidden sections | **0** |
| Failed before producing a page | 21 |

Section counts on the nine: `5, 6, 7, 7, 7, 7, 7, 7, 7` — no under-filling.

### Every pipeline failure is the provider, not the model

| Stage | Count |
|---|---|
| fill | 12 |
| profile | 8 |
| plan | 1 |

The tail of the run failed at `profile` after a single request each — the
signature of a provider that has stopped serving, not of a prompt producing bad
output. None of these clusters is prompt-fixable.

### The defect reading found

Two of the nine shipped an unfilled placeholder, both in the `about` section:

- hospital — *"Founded in [year], our 40-bed multi-speciality hospital…"*
- dental-clinic — *"Founded in Koramangala by Dr. [Name] and his family…"*

**The grader passed both.** It checked that fields were non-empty, and a slot is
not empty. `placeholderFieldsIn()` now catches it and gates `passed`, which is
what moved the result from 9/9 to 7/9.

This is a pattern rather than two accidents, and it is the first genuinely
prompt-level cluster the programme has produced: the `about` section invites
biographical facts — a founding year, a founder's name — that the description
does not supply, and v1 fills the gap with a slot instead of writing around it.

**That is a real D12 input.** `prompts/guidance/about.md` already answers it
("If it gives you none of that, write three honest sentences about what the
business does and stop"), and that guidance only reaches the model under
`fill-section.v2`, which this run did not use.

Two further defects that are *not* machine-gradeable but are visible in
`REVIEW.md`, and which the v2 guidance also targets:

- **Invented phone numbers** — `+91 253 555 0199` and `+91 79 4001 2345`, neither
  in any prompt.
- **Invented named doctors with qualifications** — "Dr. Anil Deshmukh, MD, DM
  (Cardiology), 15 years' experience" and two more, none named in the
  description.

A machine cannot know these are false. A person reading the page can, in
seconds — which is the argument for the human columns, and why `npm run review`
renders the copy for reading instead of leaving it inside `raw.json`.

### The nine that completed, and what that is worth

`hospital · law-firm · dental-clinic · veterinary-clinic · ngo · university ·
architecture-studio · logistics · yoga-studio`

Every one is a **no-template** vertical, and seven of nine passed. On the
evidence available, the claim the corpus was built to test — that a business type
nobody hand-authored a template for still gets a good page — holds 7 for 9, with
both failures being the same fixable `about`-section defect.

Two honest caveats:

- **The control group never ran.** The corpus is ordered no-template first and
  the run stopped before reaching the eight template verticals. That is a
  methodology defect, now fixed: the runner interleaves the four groups by
  default (`--order=file` restores the old behaviour).
- **Nine is a small sample of similar businesses** — health, professional and
  civic.

### Diversity — R-NEW-C, across the nine that completed

| Metric | Value | Limit | |
|---|---|---|---|
| Dominant theme share | `clinical-blue` 22% | ≤ 30% | passes |
| Dominant motion share | `calm` 56% | ≤ 40% | **fails** |
| Distinct variant sets | 8 of 9 | — | |

**Art direction did not collapse**, which is the good news the pass rate hides.
Motion clusters on `calm`, but all nine completions are health, professional and
civic businesses where calm is defensible — appropriate clustering rather than
collapse is the likelier reading, and the interleaving fix is what will tell.

### Spend

163 requests · 195,358 tokens. Groq served 145 calls (182,062 tokens); Gemini
absorbed 18 (13,296) as fallback. `npm run cost` renders the full breakdown. It
reports ₹0.00 — correct on a free tier, and flagged as *unpriced, not free*.

---

## Results

### Thresholds, for reference

Thresholds: no theme above 30% of the corpus, no motion above 40%. Looser than
the 15/25 proposed for the curated catalogue, because thirty generations is a
smaller sample.

**If `dominantThemeShare` comes back at 1.0, that is the headline finding of D11
and it outranks the pass rate.** A product where every business gets the same
look has a problem a good pass rate conceals rather than contradicts. The grader
prints it as `HEADLINE:` for that reason, and D12's tuning shifts from copy to
art direction.

### Human columns _(unread)_

| Column | Mean | Unread |
|---|---|---|
| copySensible | null | 30 |
| sectionSelectionAppropriate | null | 30 |
| artDirectionAppropriate | null | 30 |

A blank sheet is written to the results directory on every run. Means stay `null`
until a column is fully read.

---|---|---|
| Baseline run | — | — |

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
| Run the baseline | Needs ~2 days of Groq free-tier capacity, or an afternoon with billing |
| Read the 30 outputs | Three human columns; not machine-derivable |
| A clean NFR-003 P95 | Still owed from D8 — both existing figures included pacing |
| `vertical_profiles` table | Migration written (`20260812090000`); needs provisioning by E1 |
| Gallery category filter | Three pre-existing failures in discovery, unrelated to this work |
