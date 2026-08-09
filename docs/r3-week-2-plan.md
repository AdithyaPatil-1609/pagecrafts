# R3 week 2 — Persistence & API (D6–D10), Pragna's track

Written at D5 · 15:30, against the D10 milestone exit.

**D10 exit:** the core loop closes — using a template creates a project with a genuine first
commit, and edits persist with commit history.

The week has one shape: everything builds toward fork. Adhyay writes the commit; this track
makes a project exist for him to commit, and keeps it coherent afterwards.

## Where D5 left things

| | State |
| --- | --- |
| Projects | create / list / get / patch / delete, owner-scoped |
| Files | whole-tree GET+PUT, per-path GET/PUT/DELETE, dirty tracking |
| Content | `PATCH /content` applying ops against the template's `content_schema` |
| Assets | `POST /assets` for an Unsplash pick or an upload, 413 on oversize |
| Commits | mirror table, `recordCommit`, `GET /commits` (D4) |
| Entitlements | table + RLS exist (migration); **no code reads or writes them yet** |
| Fork | **not started** — `POST /projects` creates a bare row and copies nothing |

The D5 acceptance drives all of the above end to end against the migration's policies, with
a second user denied at every step. It runs on a fake database
(`tests/support/fake-db.ts`), so it proves the routes; it does not prove the SQL.

## Owed before the milestone

**One `supabase db reset` run against the real database.** The RLS policies are transcribed
into the fake by hand, and a transcription can be wrong in the same direction twice. Also
unrun: the D4 commit-mirror migration (`20260808120000_commit_mirror.sql`). Neither has
touched Postgres. This is the single biggest gap in the persistence track and it wants
doing on D6 morning, not on D10.

## The week

### D6 · File-persistence (real, transactional) + project CRUD
- **Make `PUT /files` transactional.** Today it deletes every path not in the request, then
  upserts the new set. If the upsert fails, the delete has already happened and the project
  is left short of files. The D5 acceptance did not catch this because nothing failed
  mid-way; a real database with a trigger will. This is the first thing to fix.
- Consistent reads and dirty tracking under concurrent edits — two tabs on one project must
  not corrupt the tree.
- Finalise project CRUD: get with `content_json`, `site_meta`, `form_endpoint`; the
  dashboard list joining the latest deployment.
- Support Preethi swapping the editor off the stubs onto the real endpoints
  (`docs/persistence-stubs.md` describes the swap: one line, `stubFetch` → `fetch`).

**Watch:** the stubs and the routes are held to one openapi spec, so a mismatch found during
Preethi's swap is a defect in one of the two, not something to paper over in the editor.

### D7 · Content/asset consistency + fork orchestration
- Keep `content_json` and assets coherent with the file tree across edits, commits and
  forks — no orphaned asset references (S-1).
- **Fork, project side:** on `POST /projects {sourceTemplateId}`, copy the template's files
  and `content_schema` into the new project synchronously, under 2 seconds, ready for
  Adhyay's initial commit.
- Finalise `form_endpoint` and `site_meta` so publish can emit correct meta tags and wire
  contact forms (S-2, S-3, S-4).

**Note:** Adhyay's D7 09:00 row is `GET /projects/{id}/commits` from the mirror — that
shipped at D4 on this track, route and tests included. Worth ten minutes at standup so it is
not built twice; his auto-commit hook (13:00) is the part that still needs the mirror's
`recordCommit`.

### D8 · Fork-a-template flow
- Finalise the fork response `{ id, first_commit }` and its error paths — unknown template,
  quota — in the envelope.
- **Connect the R2 gallery's "use this design" to fork.** This closes the seam R2 has been
  carrying since D4: the CTA parks at `/new?template=<id>` because `createProjectSchema`
  wants a uuid and library ids are slugs. Templates move into the table at R2 D6, so by D8
  the id is real and the CTA can fork for real. A premium or signature design is paid for at
  that CTA, once, before the fork runs (Doc 22 P2/P3).
- Integrity check on a forked project: files, `content_json`, assets and the initial commit
  all referencing each other correctly.

**Watch:** this is the day the two tracks Pragna owns actually meet. If R2 D6 slips and
templates are still a module rather than a table, fork has no real template id to copy from
and D8 slips with it. That dependency is worth stating out loud on Monday.

### D9 · History support, publish inputs, entitlements
- Back Preethi's history drawer and restore UI with correct mirror data.
- Assemble the publishable file set: meta tags from `site_meta`, contact forms wired to
  `form_endpoint`, before Adhyay pushes.
- **Entitlements** — the rows exist in the migration and nothing reads them. Implement the
  server-side check Adhyay's publish route calls, so entitlement state is never client-held
  and a paid publish never re-charges on retry (A-5, Doc 22 §6).
- Route hardening: uniform Zod validation, RLS on every owner route, the envelope
  everywhere. D5 started this — the constraint-violation translator
  (`src/lib/data/pg-errors.ts`) is the pattern to apply to the routes that still report a
  bad request as `internal`.

### D10 · Milestone
- Fork creates a project with a genuine first commit; edits persist; history reads back.
- Re-run the D5 acceptance against the real database, not the fake.

## Dependencies

| Need | From | When |
| --- | --- | --- |
| A real database to run migrations against | Adithya / whoever holds Supabase | D6, first thing |
| `isomorphic-git` commit + `recordCommit` wired | Adhyay | D8 fork |
| Templates in the `templates` table with real uuids | Pragna (R2 D6) | before D8 |
| Editor calling the real endpoints | Preethi | D6 |
| Payment result before a paid fork | Adhyay / payments | D8 |

## Carried from D5

1. **`.update({ name: undefined })` is fixed**, but the pattern is worth watching for
   elsewhere: supabase-js drops undefined at serialisation, so any "no-op update to fire a
   trigger" is an empty PATCH and fails. Write the column explicitly.
2. **`PUT /files` is not transactional** (see D6).
3. **The acceptance runs on a fake database.** Every claim it makes about RLS is a claim
   about the transcription, not about Postgres, until the reset runs.
