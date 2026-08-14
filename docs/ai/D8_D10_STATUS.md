# R5 · AI — D8–D10 status

Owner: Hanish (R5 · AI). Written against `docs/r5-d6-d7-schedule.md`'s successor
schedule. Records what landed, what did not, and why.

---

## The gap that defined these days — closed

The pipeline had no front door. It now has four:

| Route | Method | Status |
|---|---|---|
| `/api/v1/projects/{id}/generate` | POST | ✅ 202 + job id |
| `/api/v1/jobs/{id}` | GET | ✅ poll |
| `/api/v1/jobs/{id}/stream` | GET | ✅ SSE |
| `/api/v1/projects/{id}/edits` | POST | ✅ propose-only |

Each is a thin body inside `withRoute`; all pipeline logic stays in `src/lib/ai`.

---

## D8

**Block 1 — re-measure.** Done, and it produced a more interesting answer than
expected. Pass rate went **9/10 → 10/10** and repairs **13 → 5** (all now genuine
validation failures). But P95 model time went **49.4s → 73.5s**, which turned out
to be a measurement defect rather than a regression: the limiter's pacing sleep
and the `Retry-After` back-off both ran inside `complete()`, so client-side waiting
was being counted as provider time. NFR-003 excludes exactly that. Fixed —
`acquire()` reports what it waited and both waits are subtracted from `latencyMs`.

**Neither corpus run's P95 is a valid NFR-003 figure.** A third run is owed.

**Blocks 2–4 — routes and runner.** `POST /generate` returns 202 without waiting;
the runner walks `queued → planning → streaming → validating → [repairing] →
done | failed`; `GET /jobs/{id}` reports progress and names the provider. The job
store is in-memory behind a `JobStore` interface, so the D9 table is one file.

The three counter pre-checks are in the route from the start, behind
`GenerationCounters` with a permissive stub — E1's M7.1 counters swap in via
`setGenerationCounters` with no route change.

## D9

**SSE** emits `plan · section · validate · repair · done · fallback` in order, with
polling kept as the fallback for proxies that block streaming.

**Scoped edits** are reachable over HTTP and cannot write — C-03 is enforced by a
static test asserting the module reaches no filesystem API.

**Corpus** grown 10 → **30**, written as messy lowercase sentences with a location
and a service list. All 17 categories are now covered; 20 of 30 have no
hand-authored template. `tests/unit/ai/corpus.test.ts` pins the shape — size,
uniqueness, valid categories, category spread, and that prompts read like typing
rather than a specification.

Writing that test surfaced two pre-existing entries my assertions would have
rejected: `p09` is the single-phrase prompt "a website", and `p06` is terse. Both
are correct as they stand — `p09` is the only case that exercises the classifier's
"unclear → other / general-business" path — so the test was loosened to allow a
small number of terse prompts and to *require* that a vague one exists.

## What did not land, and why

| Item | Reason |
|---|---|
| Ledger rows persisted | **Blocked on E1.** The `generations` table *does* exist (initial schema) but is missing four columns the ledger produces: `provider`, `prompt_version`, `latency_ms`, `stage`. This needs an `ALTER TABLE`, not a new table — an earlier note in the D7 memo said the table did not exist, which was wrong. The ledger keeps running in memory meanwhile. |
| Files landing in a real project | **Blocked on the composition renderer, not on persistence.** `putProjectFiles()` and `recordCommit()` already exist and are ready. What is missing is anything that turns a `Composition` into a `FileMap` — that is Preethi's "section components, composition renderer", due D6 in `WEEK2_PLAN.md`. `runJob` produces a `Composition` and stops at exactly that seam. `recordCommit` also needs a `sha`, which has no source until the workspace Git layer lands. |
| D10 integration walk-through | Requires E2 and E5 in the room. Not a solo task. |
| Rubric 1–5 columns | Requires reading the generated copy. Not machine-derivable, and the go/no-go decision line stays unset until it is done. |

---

## Carried into Week 3

| Item | Why |
|---|---|
| A clean NFR-003 measurement | Both existing P95 figures included pacing |
| Re-run the corpus at 30 | Every published figure has a denominator of 10 |
| Injection corpus, ≥25 cases | M3.7, must run on every PR |
| Groq training-data terms | **Closed 2026-08-14.** `docs/ai/GATE1_GROQ_TRAINING.md` |
| Cerebras | Out of the chain. Not funding. Not in Gate 1. |
| `generations.provider` column | E1 |
| Generated files → project | E5, joint |

## Raise on D8 morning, not when reached

Three dependencies, two days, one milestone:

- **E1** — `generations` table + `provider` column; M7.1 counters
- **E5** — persistence interface for writing a generated file map
- **E2** — editor accepting a project it did not fork; the poll shape is ready now

Also outstanding to E3: their gallery ranking received `tone: minimal` for every
user until the D6 classification fix.
