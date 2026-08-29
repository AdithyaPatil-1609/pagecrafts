# Prompt changelog

Versions are tagged, not edited. A version number marks a decision; edits within
a version are ordinary work. Every eval result records the version that produced it
(`usage.promptVersion`, e.g. `plan.v1`).

---

## v1 — frozen D5

The first evaluated set. Frozen after the generation go/no-go.

| Prompt | Tier | Purpose |
|---|---|---|
| `classify.v1` | fast | free text → category, vertical, tone, palette, sections |
| `profile.v1` | strong | vertical → section recipe, art direction, vocabulary |
| `plan.v1` | strong | recipe + description → ordered sections with layout variants |
| `fill-section.v1` | strong | one section → typed content fields |
| `edit.v1` | strong | one section + instruction → changed fields |

### Decisions baked into v1

- **Allowed-value lists moved out of the prose and into the response schema.** A rule
  in a prompt is a request; a schema is a constraint. Kept in prose only where the
  model benefits from seeing the vocabulary while it reasons.
- **`fill-section` names the filler it must not write** — "Welcome to our website",
  "We are passionate about". Naming the two phrases works far better than asking
  generally for good copy.
- **`edit.v1` carries the injection-containment paragraph.** File content is data,
  never instruction. A unit test asserts the wording is still present, so a future
  tidy-up cannot remove it for looking like waffle.
- **`profile.v1` chooses art direction to be *appropriate*, not interesting.**
  Left alone a model reaches for the striking option every time, and a funeral
  home does not want the striking option.
- **`plan.v1` gives a reason beside each layout variant, not just a list.** A model
  choosing between `split-image` and `image-bg` with no guidance picks at random,
  and random variant choice is what makes a page read as machine-assembled.
- **`plan.v1` renders the variant menu from the registry** (`variantMenu()`), so the
  prompt cannot drift from the section contracts as variants are added.

### Known weaknesses, carried into D11

Observed on the D5 Groq runs (`llama-3.3-70b-versatile`), recorded while the
outputs were in front of us:

- **Plan stage returns the wrong container shape.** Some replies come back keyed by
  section type (`{ "hero": {...} }`) rather than as `{ "sections": [...] }`.
  Normalised in `generate/plan.ts` rather than in the prompt; if v2 fixes it at the
  prompt, the normaliser stays as the safety net.
- **Fill stage renames list-item fields.** `name` for `title`, `description` or
  `text` for `body`. Aliased in `generate/fill.ts`. The prompt should name the exact
  keys rather than describing them.
- **Fill stage collapses image objects to a bare string.** `image: "a clinic"`
  instead of `{ query, alt }`. Coerced in `generate/fill.ts`.
- **Art direction does not collapse** — 5 distinct (theme, motion) pairs across 6
  verticals, and the pairings are apt (`mono-precision/none` for a law firm,
  `vivid-energy/kinetic` for a gym). No prompt change needed. But `dental-clinic`
  returned `clinical-blue` on one run and `calm-sage` on another, so the choice is
  not stable across runs; re-check at D11.
- **`yoga-studio` planned only 5 sections** where the others planned 7. Not wrong,
  but worth checking at D11 whether the plan prompt under-fills for verticals with
  shorter recipes.
- **Classification coercion was a schema problem, not a prompt problem.** `tone`
  and `palette` were silently coerced to defaults on every call until enums were
  enforced provider-side. Resolved by the `gpt-oss` model switch; no v2 prompt
  change needed. Keep the `classify: coerced …` warning — it is the only reason
  this was visible.

---

### Changes made under v1 (not a version bump)

These changed how a prompt is assembled, not what it asks for, so v1 still names
the same evaluated set:

- Allowed-value lists are now generated from the registries (`registryVars()`) and
  merged by `render()`. A prompt can name `{{tones}}` without its caller knowing,
  and no list is hand-copied into a second place.
- `classify.v1` now states the allowed `tone`, `palette` and `sections` values and
  the literal JSON shape. It previously named only categories, which is why those
  two fields were the ones silently coercing.

---

## v2 — written D12, not yet adopted

`plan.v2` and `fill-section.v2` sit alongside v1. They were never the default.
Plan and fill now default to **v3** (`AI_PROMPT_PLAN` / `AI_PROMPT_FILL`).
v1 stays on disk, hash-pinned, so a D11 figure remains reproducible.

`classify`, `profile` and `edit` have no v2 — nothing recorded against them
warranted one.

### What changed, and the observation each answers

Every change below answers a weakness recorded under "Known weaknesses" above,
from the D5 Groq runs. Nothing was changed on taste, and nothing that needs D11's
taxonomy has been written yet — expect a v3 for that.

**`plan.v2`**

- Asks plainly for one object with a top-level `sections` array, *not* an object
  keyed by section type. The normaliser stays as the safety net.
- An explicit ORDER block: hero first, footer last, fixed order in between. v1
  said nothing, so ordering was arbitrary.
- "Do not pad… do not under-fill either" — answers `yoga-studio` planning 5
  sections where comparable verticals planned 7.
- Variant guidance for all ten section types, up from three. Unguided variant
  choice is what makes a page read as machine-assembled.
- "Do not use the same variant twice in a row", which `normalisePlan` had been
  silently repairing.
- Briefs must name the specific thing this business says, with a worked bad/good
  pair. A vague brief is the fill stage's only input for that section.

**`fill-section.v2`**

- **Per-section-type guidance**, via a new `{{guidance}}` variable. The blocks
  live in `prompts/guidance/<type>.md`, one per section type, selected in
  `fill.ts` — the harness has no conditionals, and keeping them as text means
  tuning a section's voice is a text edit rather than a code change.
- Exact field names, spelled as given — answers the fill stage returning `name`
  for `title` and `description`/`text` for `body`.
- Image fields are an object, never a bare string.
- A no-invention rule on facts. `contact`, `team` and `testimonials` carry the
  strong form: an invented phone number or a fabricated review is a false claim
  published on a real business's site.

### Before / after

v2 itself was never measured. A later clean six-run is what promoted v3.

---

## Changes made under v1 at D13 (not a version bump)

These changed how a prompt is *assembled*, not what any file asks for. The five
v1 files are byte-for-byte unchanged and hash-pinned in CI.

- **Every untrusted value is now wrapped by `containment/envelope.ts` before it
  is interpolated** (FR-110, M3.7). Each value goes inside a `<data-NONCE>` block
  with a per-call random nonce, and the containment paragraph is attached to the
  system message from one place. A rule that lives in five prompt files is a rule
  waiting to be missed in the sixth.
- `edit.v1`'s own containment paragraph stays where it is. It is now belt and
  braces rather than the only copy, and a test still asserts its wording.

**This changes the bytes sent to the provider.** The D5 and D8 measurements were
taken without it, so figures from before D13 and after it do not belong in the
same table.

---

## v3 — D11 taxonomy

Driven by the 15-vertical D11 sample, not by taste. v1 and v2 are untouched.

| Finding | Vertical | What v3 changes |
|---|---|---|
| Completed, missing `contact` | `event` (v22) | Plan: at the 7-section cap, drop testimonials/team/faq before contact. Contact is required when the description mentions register, venue, book. `normalisePlan` inserts it if the model still omits it. |
| Fill died on empty quotes | `unspecified` (v27) | Plan: do not include testimonials/team when the prompt names no business. Fill: required fields never `""`; optional contact facts **are** empty when unknown. |

v3 was amended after the D11 human sheet: empty contact facts are now legal in the schema, `applyTone` no longer pins `formal` to `clinical-blue`, and the JOB block stops substituting a neighbouring job (enrol vs donate, stock gallery vs posts).

A later amendment (D15 copy bar) kills the remaining human-copy misses on the
six-run: fill no longer recommends "Add … here" as a valid required-field value;
plan JOB + `normalisePlan` treat a personal site as first-person work history,
not a resume shop; a bare "a website" still gets real sentences; team briefs ask
for roles, not "Attorney Name".

A later amendment pins native-script names: fill must not transliterate a name
the person wrote (D15 v29 मिठास स्वीट्स → "Mithaas Sweet Shop"). `preserveNativeFields`
puts their spelling back on heading/tagline after fill; plan briefs name it exactly.

A later amendment (D15 v21) kills invented contact and a missing pricing table:
fill scrubs 555 / 1-800-555 / sales@example and any phone/email the description
did not give; a "pricing table" / packages ask forces a services or menu section
and fill must not say "see our pricing page".

**Default as of 2026-08-14:** `plan.v3` / `fill-section.v3`. The first v3
after-run died on a Groq TPD 429; a later clean six-run gated v27 as a
machine pass. Human copy still 2 (skeleton).

---

## expand-brief.v1 — Gemini expands, Groq builds (2026-08-25)

`expand-brief.v1` turns the short IntentCapture form (name, place, offer, …)
into a detailed build brief. `runJob` calls it with `prefer: 'gemini'` before
classify / plan / fill (which prefer Groq). Soft-fails to the original brief when
Gemini is missing or the call fails.

To reproduce the D11 baseline, pin v1:

```bash
AI_PROMPT_PLAN=plan.v1 AI_PROMPT_FILL=fill-section.v1 npm run grade -- --label=baseline
```

---

## expand-brief.v2 — pushing the known failures upstream (2026-08-29)

`expand-brief` is the one text prompt that runs on Gemini (`prefer: 'gemini'`);
classify, profile, plan, fill and edit all prefer Groq. It also runs *before* all
of them and is the only thing they see, so a fact it drops is a fact they invent.

v2 changes nothing on taste. Every rule added answers a failure already recorded
above against the stages downstream of it — the point being that a rule enforced
after the brief is written is a repair, and the same rule in the brief is a
prevention:

| Rule added to v2 | The observation it answers |
|---|---|
| Business name kept character for character, never transliterated | D15 v29 — मिठास स्वीट्स came back as "Mithaas Sweet Shop"; `preserveNativeFields` repairs it after fill |
| Never write 555 / 1-800-555 / anything@example.com; say a fact was not given | D15 v21 — invented contact, scrubbed after the fact by `scrubOptionalFields` |
| Say plainly when no staff and no reviews were given | v27 `unspecified` — fill died on empty quotes; v3 stopped *planning* those sections, but the planner had to infer their absence |
| Name what the business actually sells, in its own terms, with a bad/good contrast | plan.v2 — "briefs must name the specific thing this business says"; a vague brief is fill's only input |
| A thin brief ("a website") describes one person's own work, first person, no company | v3 D15 amendment — a personal site is not a resume shop |
| Register / book / venue / event date means contact matters | v3 — `event` (v22) completed without a contact section |
| States what the answer is used for (a section planner, then a copy writer) | New. The prompt asked for "a detailed build brief" without saying who reads it |

Selectable like the others: `AI_PROMPT_EXPAND`, defaulting to `expand-brief.v2`.
v1 stays on disk. To reproduce a pre-v2 figure:

```bash
AI_PROMPT_EXPAND=expand-brief.v1 npm run grade -- --label=pre-v2
```

**Not measured.** No eval run has been taken against v2 — this changes the bytes
sent to Gemini, so a figure from before it and one from after it do not belong in
the same table. It needs a six-run before it can be called an improvement.

### Image prompts — framing follows the section (same date)

`imagePromptFor` (Gemini, `src/lib/images/gemini-image.ts`) asked every photograph
for "room for a headline", including the ones that never carry one. `site-photos`
already varies the aspect ratio by section type; the framing now uses the same
signal — heroes hold space for a headline, team photos are portraits, and gallery
or menu tiles let the subject fill the frame. The negatives are unchanged and a
test asserts they survive on every section.

Also unmeasured, and cheaper to judge: the output is a picture you can look at.
