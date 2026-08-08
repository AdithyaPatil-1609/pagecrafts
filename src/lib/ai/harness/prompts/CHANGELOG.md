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

## v2 — planned D12

Tuning against the 30-vertical corpus. Do not edit v1 in place; copy to `.v2`
and record the before/after pass rate here.
