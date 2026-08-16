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

### D17 · Data support for the publish edge cases
Adhyay's week 4 is subdomain collision, propagation timeout, failure after payment, and
credential rotation. Each needs something from this side:

| His edge case | What persistence owes it |
| --- | --- |
| Subdomain collision | a stable slug per project, and a record of which one was taken |
| Propagation timeout | a deployment row that can sit in `verifying` and be resumed, not just failed |
| Failure after payment | the entitlement stays granted, and the retry is not a second charge |
| Credential rotation | nothing stored that pins a deployment to one credential version |

The third is the one to get right. A person who has paid and whose publish then failed must
never be asked to pay again, and the only thing standing between them and that is the
entitlement being read rather than re-granted.

### D18 · Failure states with words a person can act on
- Every error a publish can produce, mapped to a message that says what happened and what
  happens next. No code, no jargon, no "something went wrong".
- The dashboard shows a failed publish without the owner opening the project (V-7) — verify
  it does for each failure mode, not just the generic one.
- Retry from a failed state, and make sure it cannot double-charge or double-provision.

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
2. **Taxonomy** — Health / Wellness / Health & Wellness, Retail / E-commerce, Technology /
   Business are separate buckets because the mockups labelled them separately. A product
   decision, not a cleanup, and it should be made before launch rather than after.
3. ~~**A load-sensitive test.**~~ Closed on D16. It was never logic: the route tests import
   the route from inside the test body so mocks apply first, and on a full run that import
   is slower than the 5s default timeout the test is judged against. `testTimeout` raised to
   30s in `vitest.config.mts` with the reasoning written there.
4. **`applyContentToFiles` is now called in two places** — the editor as you type, and the
   publish build as a backstop. That is deliberate, and the reason is written where it
   happens, but if a third caller appears the rendering should move to one owner.
5. **The platform prelude is a reconstruction.** `scripts/db/platform-prelude.sql` is our
   version of what Supabase provides, and nothing compares it to the real thing. If it drifts,
   `tests/db/` keeps passing while production differs. The `database` CI job runs against real
   Supabase on every PR, so a drift that matters should show up there — but it would show up
   as a confusing disagreement between two green-looking checks, not as a clear message.
