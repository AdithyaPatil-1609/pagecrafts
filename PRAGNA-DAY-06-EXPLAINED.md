# PageCraft Persistence & API — R3 Day 6, Every File Explained

R3 Day 6 · Persistence & API · Pragna · all paths are from the repo root

---

## What Day 6 is, in one sentence

The week plan (`docs/r3-week-2-plan.md`) says:

> **D6 · File-persistence (real, transactional) + project CRUD**

In plain words: **make saving safe when more than one person is saving.**

The routes already worked. What they did not survive was two people — or one person with
two tabs — editing the same project at once.

---

## Where things stood at the end of Day 5

| | State |
| --- | --- |
| Projects | create / list / get / patch / delete, owner-scoped |
| Files | whole-tree GET+PUT, per-path GET/PUT/DELETE, dirty tracking |
| Content | `PATCH /content` applying ops against the template's `content_schema` |
| Assets | `POST /assets`, 413 on oversize |
| Commits | mirror table, `recordCommit`, `GET /commits` |
| Entitlements | table + RLS exist; no code reads them (D9's problem) |
| Fork | not started (D7/D8) |

---

## The four things D6 owes, and what was actually left

The plan lists four items. Three of them were already standing when the day began — worth
saying plainly rather than claiming credit for them:

| Item | State at the start of D6 |
| --- | --- |
| Make `PUT /files` transactional | **Already done.** `replace_project_files` does the delete, the upsert and the touch in one statement (`20260808160000_commit_snapshots.sql`) |
| Project CRUD with `content_json`, `site_meta`, `form_endpoint` | **Already done.** `src/lib/data/projects.ts`, the `PROJECT_COLUMNS` select |
| Dashboard list joining the latest deployment | **Already done.** `deployments(status, live_url, created_at)` in `SUMMARY_COLUMNS` |
| **Consistent reads under concurrent edits** | **Not started.** Nothing in `src/` or the spec mentioned a precondition, a version or an ETag |

So Day 6 is one job: the last row.

---

## The bug, in one picture

`PUT /files` replaces the whole tree. Every path *not* in the request is deleted — that is
what makes a rename or a delete work at all. Correct for one writer. With two:

```
              tab A                          tab B
  10:00       GET /files  -> {index}         GET /files  -> {index}
  10:01       adds about.html
              PUT /files  {index, about}
              200 OK
  10:02                                      PUT /files  {index}
                                             200 OK      <-- about.html is now deleted
```

Nothing here looks like an error. Tab B's request is internally consistent; it is simply
describing a tree that stopped being true a minute ago. Both people see a successful save
and one of them has silently lost a page.

This is the failure mode the plan means by *"two tabs on one project must not corrupt the
tree"*.

---

## The fix, and the one decision worth arguing about

The caller says **which version of the tree it is replacing**. If the project has moved on
since, the write is refused and nothing changes.

The decision worth stating: **the check lives in SQL, not in the route.** The obvious
implementation is to read `updated_at`, compare it, then write:

```
  read updated_at        <-- 10:02:00.000
  compare, looks fine
                         <-- 10:02:00.140  the other tab commits here
  write                  <-- 10:02:00.210  and the check that "passed" was already stale
```

That window is not theoretical; it is the whole race, just moved somewhere harder to see.
Inside the function, `select ... for update` takes a row lock, so a second writer blocks on
that line until the first transaction finishes and then reads the timestamp the first one
wrote. The check and the write are the same transaction, which is the only version of this
that is actually true.

The precondition is **optional**. Fork and restore mean "make the tree look like this", not
"merge with whatever is there", so they omit it and keep the old behaviour deliberately.

---

# Files to create

---

## 1 · `supabase/migrations/20260810120000_files_optimistic_concurrency.sql`

Replaces `replace_project_files` with a three-argument form taking
`p_expected_updated_at timestamptz default null`.

Two details that are easy to get wrong:

- **`drop function` first.** `create or replace function` matches on name *and argument
  types*, so adding a parameter would have created a second overload and left the old
  two-argument version callable — a way to bypass the check without noticing.
- **`select ... for update` before anything else**, so the lock is held for the whole
  delete/insert/update, not just the read.

When the timestamps disagree it raises `stale_write`. When the project is not visible —
RLS, or it genuinely does not exist — it still raises `project_not_found`, unchanged.

## 2 · `supabase/rollback/20260810120000_files_optimistic_concurrency.sql`

Restores the two-argument function exactly as the D8 snapshot migration left it, dropping
the three-argument form first for the same overload reason.

## 3 · `tests/unit/persistence-concurrency.test.ts`

Six tests. The one that matters is the first: two tabs, the stale save is refused, **and
the first tab's page is still on disk afterwards**. Asserting the refusal alone would not
prove the write did not land partially.

Every timestamp is a fixed seeded value (`2026-08-01T00:00:00.000Z`), never a second
reading of the clock. Two writes inside one millisecond would otherwise produce equal
timestamps and the test would pass or fail on how fast the machine is — the repo has
already been bitten by exactly that in `tests/unit/ai/openai-compat.test.ts`.

I checked these tests are not vacuous by disabling the precondition in the fake and
confirming the first one fails with *"promise resolved instead of rejecting"*.

---

# Files to change, rather than create

---

## 4 · `src/lib/contracts/error-codes.ts`

Adds `conflict`. It is not `validation_failed`: nothing about the request is malformed, and
it would have succeeded a moment earlier. Sending 422 would point the editor at its own
payload, which is the wrong place to look.

Adding the code is compiler-guarded — two exhaustive `Record<ErrorCode, …>` maps refuse to
build until it is handled, which is how both of the next two files were found rather than
remembered.

## 5 · `src/lib/errors/codes.ts`

`conflict: 409`.

## 6 · `src/lib/api/messages.ts`

The user-facing string. It leads with *"Nothing was lost"*, because that is the thing
someone is afraid of when a save fails, and it is true here — the write was refused before
anything changed.

## 7 · `src/lib/contracts/schemas.ts`

`putFilesSchema` gains `expectedUpdatedAt: z.string().datetime().optional()`.

`.datetime()` rather than `.string()` is deliberate: a precondition that silently fails to
parse is worse than no precondition, because the caller believes it is protected and is
not. A test covers the rejection.

## 8 · `src/lib/contracts/api-contracts.ts`

`PutProjectFilesRequest.expectedUpdatedAt?: string`.

## 9 · `src/lib/data/project-files.ts`

Passes the precondition into the RPC and translates `stale_write` into the 409. The
`not_found` translation above it is untouched.

## 10 · `src/app/api/v1/projects/[id]/files/route.ts`

One line — hands `body.expectedUpdatedAt` through.

## 11 · `tests/support/fake-db.ts`

The fake's `replace_project_files` gets the same check. Without this the suite would prove
nothing about the feature: the acceptance runs on the fake, so a behaviour that exists only
in the migration is a behaviour no test can see.

**This is a transcription, and transcriptions can be wrong in the same direction twice.**
It is the same caveat the plan already carries about RLS.

## 12 · `docs/openapi.yaml`

`conflict` in the error enum; `expectedUpdatedAt` on the request body; an explicit `409`
on `putProjectFiles` saying that nothing was written and the caller should re-read.

## 13 · `tests/unit/restore.test.ts`

Restore pins the exact RPC arguments, so it now expects `p_expected_updated_at: null`. The
comment records *why* null is right there, so nobody later reads it as an oversight and
"fixes" it.

---

## For Preethi, when the editor swaps off the stubs

The editor already receives `updatedAt` from `GET /files` and from every successful
`PUT /files`. To opt in:

1. Keep the last `updatedAt` you were given.
2. Send it as `expectedUpdatedAt` on the next `PUT /files`.
3. On a 409, re-read the tree and reconcile before retrying. `friendlyMessage('conflict', …)`
   already has the wording.

Sending nothing keeps today's behaviour exactly, so this does not have to land in the same
change as the stub swap.

---

## What Day 6 does *not* close

**The `supabase db reset` against the real database has still not been run.** The plan puts
it at "D6, first thing" and calls it the single biggest gap in the persistence track. It
needs Supabase credentials I do not have, so it is not done here.

Until it runs, this is what is and is not proven:

| Claim | Proven by |
| --- | --- |
| The route refuses a stale write with 409 | Tests, against the fake |
| Nothing is written when it refuses | Tests, against the fake |
| `select … for update` actually serialises two writers | **Nothing yet** — needs Postgres |
| The new migration applies cleanly | **Nothing yet** — needs the reset |

The lock is the part that most wants a real database. It is the one line whose behaviour
the fake cannot model, because the fake has no transactions.

---

## Verification

```
npm run typecheck     clean
npm test              803 passed (77 files)
npm run lint          0 errors
```
