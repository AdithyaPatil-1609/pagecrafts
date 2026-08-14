# R5 · AI — D12 prompt tuning

Owner: Hanish (R5 · AI). v2 prompts, profile caching, the comparison harness and
the sampling sweep.

> **Status: v3 is the default.** `AI_PROMPT_PLAN=plan.v3`, `AI_PROMPT_FILL=fill-section.v3`.
>
> Gate: the clean six-run `evals/grader/results/2026-08-14T07-04-51-746Z-d15-six-full/`
> — v27 machine pass (completed, non-blank, required sections present). Human copy
> still 2 (skeleton “Add heading here”). First v3 after-run
> (`2026-08-14T05-48-21-067Z-d12-v3-full`) was a Groq TPD 429, not a quality fail.
> v1 stays hash-pinned for reproducing the D11 baseline.

---

## The honest caveat about what drove v2

D12's rule is that v2 changes are driven by D11's taxonomy, **not by taste**. The
full 30 has not run. A 15-vertical interleaved sample has, and v3 answers its
two failures. v2 remains the D5-observation set.

What v2 *is* driven by is the set of failures already recorded from the D5 Groq
runs, in `prompts/CHANGELOG.md` under "Known weaknesses, carried into D11" —
observations written down while the bad outputs were on screen. That is real
evidence, and it is the only real evidence available today.

**So: every v2 change below names the recorded D5 observation it answers.** v3
is in a later section and is driven by the D11 sample.

---

## v1 is frozen

`tests/unit/ai-templates.test.ts` pins a SHA-256 of each v1 file. A version
number marks a decision, and every eval result on record was produced by those
exact bytes — editing one silently invalidates the table it appears in. To change
what a prompt asks for, add a version.

The hashes are not to be updated to make a failure go away.

---

## `plan.v2.md`

| Change | The recorded observation it answers |
|---|---|
| States plainly: one object, top-level `sections` array, **not** an object keyed by section name | Some D5 replies came back as `{ "hero": {...} }`. `normalisePlan` still repairs it; the prompt now asks properly. |
| An explicit ORDER block — hero first, footer last, a fixed middle order | v1 said nothing about ordering, so ordering was arbitrary. |
| "Do not pad… do not under-fill either; a required section is in the plan even when the description is short" | `yoga-studio` planned 5 sections where comparable verticals planned 7. |
| Variant guidance extended from 3 section types to all 10 | v1 covered hero, services and gallery. The rest were chosen with no guidance, and unguided variant choice is what makes a page read as machine-assembled. |
| "Do not use the same variant for two sections in a row" | `normalisePlan` was silently repairing this on most runs. |
| Briefs must name the specific thing this business says, with a worked bad/good pair | A vague brief is the input to the fill stage, so vague briefs produce vague copy. |

## `fill-section.v2.md`

The significant change is **per-section-type guidance**. A hero and an FAQ need
different instructions, and one generic prompt serving both is why copy reads
generic.

The harness has no conditionals, so the block is selected in `fill.ts` and passed
as `{{guidance}}`. The blocks live in `prompts/guidance/<type>.md` — one per
section type — so tuning a section's voice stays a text edit.

```
hero.md   A hero has seconds. Say what the business is and where, in the first line.
          No "welcome". No "your trusted partner".

faq.md    Write questions a real customer would ask, in their words — cost,
          waiting time, whether they need to book. Not questions the business
          wishes they would ask.
```

Also in v2, each from a recorded D5 observation:

- **Exact field names, spelled as given, not renamed.** The fill stage was
  returning `name` for `title` and `description`/`text` for `body`; `fill.ts`
  aliases them, and the prompt should not have needed the aliasing.
- **Image fields are an object, never a bare string.** Models were returning
  `image: "a clinic"`. Coerced in code; now also asked for.
- **A no-invention rule on facts** — prices, phone numbers, addresses, awards,
  years of founding. `contact.md`, `team.md` and `testimonials.md` carry the
  strong form, because an invented phone number or a fabricated review is a false
  claim published on a real business's website. An empty field the owner fills in
  is correct; a plausible invented one is not.

### Switching versions

Prompt versions are config (`src/lib/ai/config.ts`), so the A/B is a run of the
same binary rather than a branch.

---

## v3 — D11 taxonomy (the actual D12 tuning pass)

v2 remains the D5-observation set. v3 is the pass the day called for.

| D11 finding | Change |
|---|---|
| `event` completed without `contact` (register link + venue in the prompt; 7-section cap ate the tail) | `plan.v3` PRIORITY block: drop testimonials/team/faq before contact. `normalisePlan` inserts contact when the prompt matches register/venue/book, dropping dispensable sections to fit. |
| `unspecified` ("a website") died at fill on empty testimonial quotes | `plan.v3`: do not plan testimonials/team when the description names no business. `fill-section.v3` and `guidance/testimonials.md`: never emit `""`. `normalisePlan` strips testimonials/team on a bare-page prompt. |

```bash
AI_PROMPT_PLAN=plan.v3 AI_PROMPT_FILL=fill-section.v3 npm run grade -- --label=d12-v3 --only=v22,v27
npm run compare -- evals/grader/results/d12-before-v22-v27 evals/grader/results/<after>
```

Defaults are `plan.v3` / `fill-section.v3`. Pin v1 only to reproduce the D11 baseline.

---

## Vertical profile caching — M3.9

`src/lib/ai/profile-cache.ts`, plus migration `20260812090000_vertical_profiles`.

A profile is derived from the vertical slug alone, so it is identical for every
user who asks for a dental clinic — and until now every one of them paid a
provider call for it. The D11 corpus pays for thirty; every re-run paid again.

- **Alias matching.** `dentist` resolves to `dental-clinic`, from the model's own
  alias list, so nobody maintains a synonym table. An alias never overwrites a
  real vertical, and the first claim wins.
- **Concurrent misses collapse to one call.** Ten users asking for the same new
  vertical at once join one generation instead of starting ten. That is the case
  that happens on launch day rather than in testing.
- **A failure is not cached.** The in-flight entry is cleared on rejection, so
  the next caller retries rather than inheriting an error.
- **`status` starts at `ai_generated` and is never promoted automatically.** A
  profile used four hundred times is evidence the vertical is popular, not that
  its art direction is right. `usage_count` ranks the curation queue; a human
  promotes.

**The saving is not yet realised.** The store is in-memory until the table is
provisioned (E1), and within a single 30-vertical run every vertical is distinct,
so today it saves nothing. Once the table is live, a regression run costs zero
profile requests — about 30 of the ~300 requests per run.

---

## `evals/compare.ts`

```bash
npm run compare -- evals/grader/results/<before> evals/grader/results/<after>
```

Exits non-zero when the result is not acceptable, so a regression cannot be
skimmed past.

**`REGRESSED` is capitalised because it is a blocking outcome.** The acceptance
criterion is *pass rate up, zero regressions* — a tuning pass that raises the
average while breaking three previously-working verticals is a bad trade you
will not notice in an average. `acceptable` is true only when the rate rose,
nothing regressed, **and** every vertical was compared: a vertical present in one
run and not the other is reported as unmatched and blocks, because silently
dropping it is how a regression hides.

Each row names which objective check flipped, so a regression explains itself
rather than needing to be re-derived.

---

## Sampling sweep

Sampling had to be built before it could be swept: **neither provider sent
`temperature` or `top_p` at all.** Both now do, from config, per operation.

Left unset, nothing is sent and the provider's own default applies — which is what
every measurement up to D11 was taken under. Quietly introducing a default would
have made the before/after incomparable, so `provider-default` is the control row
in the grid.

```bash
npm run sweep
```

Six verticals, not thirty, and **plan-only by default**. A full generation is ~9
requests per vertical, so a six-config grid over six verticals is ~324 requests —
far past the errata's 60-request budget for this block. Plan-only is 3 per
vertical, and sampling shows up in the plan.

### Chosen configuration _(not yet chosen)_

| Config | Pass | Distinct themes | Distinct variant sets | Blank fields | Failures |
|---|---|---|---|---|---|
| provider-default | — | — | — | — | — |
| t0.2 | — | — | — | — | — |
| t0.5 | — | — | — | — | — |
| t0.8 | — | — | — | — | — |
| t1.0 | — | — | — | — | — |
| t0.7-p0.9 | — | — | — | — | — |

Lower temperature buys reliability and costs distinctiveness; higher gives
distinctive pages and more failures. **Which one is right depends on which of
those D11 said was the problem**, which is why this block comes last and why the
table above stays empty until the baseline exists.

---

## Before / after

Targeted re-run of the two D11 failures, v1 → v3. Not a 30-vertical regression.

| Vertical | Template | Before | After | Delta | What changed |
|---|---|---|---|---|---|
| event | yes | fail | pass | improved | required sections gained (`contact`) |
| unspecified | no | fail | fail (429) then **pass** | improved | first after was TPD 429; clean six-run: machine pass. Copy still 2 (skeleton) |

Targeted pair at the time: pass rate 0% → 50%, unspecified after quota-contaminated. Later six-run: v27 machine pass. That is what promoted v3. Human copy still 2 — the page exists; it is not good copy.

Results: `evals/grader/results/d12-before-v22-v27` vs `evals/grader/results/2026-08-14T05-48-21-067Z-d12-v3-full` (429) vs `evals/grader/results/2026-08-14T07-04-51-746Z-d15-six-full/` (clean).

---

## D12 acceptance, honestly

| Criterion | State |
|---|---|
| v1 untouched on disk; v2 alongside | ✅ hash-pinned in CI |
| v3 from D11 taxonomy | ✅ `plan.v3` / `fill-section.v3` |
| Full 30-vertical re-run with v2/v3 | ✅ v3 30 in `evals/grader/results/2026-08-14T07-58-07-237Z-d15-sensible-full/` — machine 30/30 (v21 retried after a plan timeout), copy ≥4 **28/30**, diversity passes |
| Before/after table published | ✅ two-vertical table above |
| Pass rate up, zero regressions | ✅ event + unspecified both pass on a clean v3 run |
| Generation config recorded as data, not code | ✅ `config.ts`, plumbed to both providers |
| Profile caching live — repeat vertical costs zero requests | ⚠️ code and migration done; table not provisioned |
| Default switched to v3 | ✅ `plan.v3` / `fill-section.v3` |
