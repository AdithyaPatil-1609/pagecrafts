# R3 week 4 — Persistence & API (D16–D20), Pragna's track

Written at D15 · 15:30, against the D20 milestone exit.

**D20 exit:** publish edge cases fail gracefully with a clear message.

Week 4 is not a feature week. Everything the product needs to work exists; what it does not
yet have is a good answer for the day something goes wrong. The whole week is spent on the
paths nobody demos.

## Where D15 left things

| | State |
| --- | --- |
| Publish build | content, images, meta, forms — all verified on the build, including a republish |
| Injection | every owner-typed value escaped at the renderer; asserted with hostile input |
| Assets | referenced images bundled, replaced ones left behind, a missing file no longer blocks the publish |
| Deployment history | `GET /projects/{id}/deployments`, attempts and failures alike |
| Edit gate | applied to every write path (D14) |
| Route hardening | uniform envelopes, constraint violations translated, RLS on every owner route |

## Owed before D20, and it has not moved

**Not one migration in this track has run against Postgres.** Twenty migration files exist;
the fake database transcribes their RLS policies by hand, and a transcription can be wrong
in the same direction twice. This has been carried since D5 and is now the largest single
risk to the launch, because the first real `supabase db reset` will find whatever is wrong
with all twenty at once rather than one at a time.

It wants half a day at the start of D16, not an afternoon in D20.

> **Closed on D16 — and the premise above was already half wrong when it was written.**
>
> Repairing CI on D15 turned the `database` job back on, and it has run
> `supabase db reset --local` and `supabase db lint --local` green three times since. The
> migrations had in fact executed against real Supabase Postgres before D16 began. Recorded
> here rather than quietly deleted, because the plan overstated the risk and the correction
> belongs next to the claim.
>
> What genuinely had never happened is narrower and worse: **no policy had ever been
> exercised.** `db reset` proves twenty files apply; it does not read a row as one user and
> fail to read it as another. Every ownership guarantee in the API still rested on the
> hand-written fake. D16 closed that — see `tests/db/`, `scripts/db/` and the revised
> `docs/database-workflow.md`.

## The week

### D16 · Run the database, then harden what it tells you
- `supabase db reset --local`, every migration in order, seed, linter. Fix what falls over.
- Re-run the D5 persistence acceptance and the D10 verify script against the real database
  rather than the fake, and reconcile any difference between the two.
- Whatever the reconciliation finds becomes the day's hardening list.

### D17 · Data support for the publish edge cases — **done**
Adhyay's week 4 is subdomain collision, propagation timeout, failure after payment, and
credential rotation. Each needs something from this side:

| His edge case | What persistence owes it | State |
| --- | --- | --- |
| Subdomain collision | a stable slug per project, and a record of which one was taken | fixed |
| Propagation timeout | a deployment row that can sit in `verifying` and be resumed, not just failed | built |
| Failure after payment | the entitlement stays granted, and the retry is not a second charge | already right; now proven |
| Credential rotation | nothing stored that pins a deployment to one credential version | already right; now guarded |

The third is the one to get right. A person who has paid and whose publish then failed must
never be asked to pay again, and the only thing standing between them and that is the
entitlement being read rather than re-granted.

**The payment case needed no change.** `assertCanPublish` reads the grant and `grantPublish`
is idempotent on a unique index, so a retry finds the entitlement the first attempt was made
under. Four tests now hold that: the grant survives a failed publish, the retry passes the
gate, three attempts leave one row, and an unpaid publish is refused before anything is
recorded. Credential rotation was likewise already sound — nothing about a credential reaches
a row — and there is now a test that fails if a token, key id or signed URL ever lands in one.

**The collision case was broken, and not in the way the plan expected.** The site id is
remembered on `projects.repo_full_name`, so a *successful* publish is reused on republish.
But that write only ran on success. An attempt that provisioned a site and then died at
pushing had really claimed the subdomain — and nobody recorded it, so the retry re-derived
the address from the project name, was told by the host it was taken (by the site we had
just abandoned), and published to `name-2`. **A transient upload error moved somebody's
address and orphaned their first site.** `PublishError` now carries the site id and the
publish path stores it on failure.

**And the address itself was wrong on the configured provider.** `publish()` computed the
subdomain as `siteId.split('/')[1]` — one adapter's `owner/name` shape, assumed for all of
them. Against the default, whose site id is the bare subdomain, that index is `undefined`, so
every publish verified, reported and stored `https://undefined.<root domain>`. Every publish
test used a fake built in the other shape, which is why nothing caught it. The adapter now
answers `addressFor(siteId)`, which is also what NFR-041 wanted all along.

**Propagation.** A timed-out verification used to report `pending` — the state an attempt
*starts* in — so a site that was provisioned, pushed and hosted looked identical to one that
had done nothing, and nothing could resume it. It rests in `verifying` now, and
`resumeVerification()` re-checks the one URL and promotes it. That runs on the poll the
client is already making, so there is no scheduler and no site left one DNS refresh short of
live. It re-provisions nothing, so polling it is free; a check that itself errors leaves the
attempt alone rather than turning a flaky network into a permanent failure.

### D18 · Failure states with words a person can act on — **done**
- Every error a publish can produce, mapped to a message that says what happened and what
  happens next. No code, no jargon, no "something went wrong".
- The dashboard shows a failed publish without the owner opening the project (V-7) — verify
  it does for each failure mode, not just the generic one.
- Retry from a failed state, and make sure it cannot double-charge or double-provision.

**Found first: the publish route was not running the publish path.** `publishProject()` —
written at D15 with the entitlement gate, and hardened at D17 with the site-id memory — has
never been called from `src/app`. The route carried its own inline copy of the whole
sequence, which passed `siteId: null` on every call under a comment saying no column held
it. So every republish provisioned a fresh site and abandoned the last: **FR-087 says ten
republishes produce one site, and this produced ten.** The D17 collision work was in the
function nothing ran, so it protected nobody. That is a correction to the D17 report, which
described those fixes as landed when they were landed beside the live path rather than in
it. One publish path now; the route is the door and the `openDeployment` concurrency guard
moved in with the rest of what a publish has to decide.

**The failure vocabulary.** A failure used to store one sentence, written wherever it was
caught. Three consequences, all of them visible to the customer rather than to us: the
sentence said what broke and stopped, with no "what next"; one path stored the literal
string `verification_timeout`, a code, in a column a person reads; and because the prose
*was* the record, improving the wording could never help a row already written.

`deployments.failure_reason` stores a value from a closed set and `src/lib/deploy/failure.ts`
turns it into words at read time. `error` keeps the redacted provider detail, for support,
and is no longer shown to anyone. Seven reasons, each with what happened, what happens next,
and whether a retry is worth offering.

**V-7, as far as this track owns it.** There is no dashboard page in the app — `src/app` has
no project list — so "the dashboard shows it" can only be delivered as the data behind it.
`ProjectSummary` now carries `failure: { reason, what, next, retryable } | null`, documented
in `openapi.yaml`, and `tests/contract/publish-failure-states.test.ts` asserts it for each
mode by driving a real publish to that failure and reading the row back through
`listProjects`. Whoever builds the page has everything it needs; **the page itself is still
owed, and it is not on this track.**

`not_answering_yet` is carried on the summary too, though it is not a failure. Somebody who
pressed publish two minutes ago and sees nothing assumes the worst, and the words for that
reason say the site is published and switching on.

**Retry.** Three tests: a second attempt takes no second payment, claims no second site, and
a second attempt while one is still in flight returns the running one rather than starting a
race. The last of those was the guard that moved out of the route — and the fake database
had no `.in()`, so it had never been exercised against a fake at all.

### D19 · Freeze, and the audit nobody wants to do late
- Route audit: every owner route RLS-scoped, every input Zod-validated, every response in
  the envelope. There is a test for each of these already; the audit is confirming no route
  added since escaped them.
- Check the seed data matches the schema after twenty migrations.
- Day-19 freeze: polish and configuration only.

### D20 · Launch support
- Watch the publish funnel and Sentry; triage without shipping.
- Keep a live note of anything that fails in the wild, for R4.

## Carried in, still open

1. ~~**The database has never been run.**~~ Closed on D16; see the note above for what was
   actually wrong and what was already fine.
2. ~~**Taxonomy**~~ — decided on the R2 track at D17. `agency` folded into `business`,
   `wellness` and `health` into `health_wellness`, `retail` into `store`; the enum values stay
   and resolve through an alias, so nothing the database or the classifier emits is orphaned.
3. ~~**A load-sensitive test.**~~ Closed on D16. It was never logic: the route tests import
   the route from inside the test body so mocks apply first, and on a full run that import
   is slower than the 5s default timeout the test is judged against. `testTimeout` raised to
   30s in `vitest.config.mts` with the reasoning written there.
4. **There is no dashboard page.** `src/app` has no project list, so V-7 — a failed publish
   legible without opening the project — exists as far as the API and no further. The data
   is complete and documented; the page is owed by whoever owns the app shell.
5. **`applyContentToFiles` is now called in two places** — the editor as you type, and the
   publish build as a backstop. That is deliberate, and the reason is written where it
   happens, but if a third caller appears the rendering should move to one owner.
6. **The platform prelude is a reconstruction.** `scripts/db/platform-prelude.sql` is our
   version of what Supabase provides, and nothing compares it to the real thing. If it drifts,
   `tests/db/` keeps passing while production differs. The `database` CI job runs against real
   Supabase on every PR, so a drift that matters should show up there — but it would show up
   as a confusing disagreement between two green-looking checks, not as a clear message.
