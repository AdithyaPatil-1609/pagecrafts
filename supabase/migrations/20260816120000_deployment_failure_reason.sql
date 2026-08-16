-- R3 D18 — a failed publish records why, as a value rather than as a sentence.
--
-- `deployments.error` held the whole story: one line of prose, written at the moment of
-- failure by whichever branch caught it. Three things follow from that, and all three are
-- visible to the person rather than to us.
--
-- The prose says what broke and stops. "We could not upload your site files." is true and
-- leaves the reader with no idea whether to wait, retry, or ask for help — and D18's whole
-- brief is messages that say what happens next.
--
-- One path stored `verification_timeout`. A code, in a column the dashboard shows.
--
-- And because the sentence *was* the record, improving the wording could never help a row
-- already written. Every failure in the table keeps whatever it was given.
--
-- So the reason is stored and the words are derived when somebody reads them
-- (src/lib/deploy/failure.ts). `error` stays: it carries the redacted provider detail that
-- is worth having when debugging somebody's failed publish, and it is not what gets shown.
--
-- Text with a CHECK rather than an enum. The set will grow as real failures are seen in the
-- wild, and adding a value to a Postgres enum cannot be done inside a transaction that also
-- uses it — which turns a one-line change into a two-migration dance. The constraint gives
-- the same protection against a typo.

alter table public.deployments
  add column if not exists failure_reason text;

alter table public.deployments
  drop constraint if exists deployments_failure_reason_check;

alter table public.deployments
  add constraint deployments_failure_reason_check check (
    failure_reason is null or failure_reason in (
      'provisioning_failed',
      'upload_failed',
      'hosting_failed',
      'not_answering_yet',
      'nothing_to_publish',
      'not_paid_for',
      'unknown'
    )
  );

-- Rows that failed before this column existed. They have prose and no reason, and
-- `unknown`'s words — nothing is lost, try again, tell us if it persists — are true of all
-- of them. Better than null, which the reader would render as no explanation at all.
update public.deployments
   set failure_reason = 'unknown'
 where status = 'failed'
   and failure_reason is null;

comment on column public.deployments.failure_reason is
  'Why a publish stopped, from a closed set. The person-facing wording is derived from this at read time — see src/lib/deploy/failure.ts. `error` holds the redacted provider detail for debugging and is never shown.';
