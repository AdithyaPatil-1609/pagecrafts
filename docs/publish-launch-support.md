# Launch support: the publish funnel

Written at R3 D20, for whoever is on support the day this goes live. It assumes you were not
here while it was built.

**The rule for the day: triage, do not ship.** A fix that is not a one-line configuration
change waits. Write it down, at the bottom of this file.

## Before you can watch anything

Two environment variables, and neither is set in this repository:

| Variable | Without it |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` | `track()` returns immediately. No funnel, no counts. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | `captureError()` returns immediately. No issues, ever. |

Check them first. Everything below is silent otherwise, and silence will look exactly like
"nothing is failing".

## The events

| Event | Fires | Properties |
| --- | --- | --- |
| `publish_started` (EV-06) | the attempt is real: past the entitlement gate, past the empty-files check, with a deployment row | `republish` |
| `publish_completed` (EV-07) | the provider work finished without throwing | `state` (`live` or `verifying`), `reason`, `republish` |
| `publish_failed` (EV-08) | it threw | `reason`, `republish` |

`state: "verifying"` on a *completed* event is not a failure. The site is provisioned,
pushed and hosted, and DNS has not caught up. It finishes itself on the next poll. Counting
those as failures will make a slow afternoon look like an outage.

Started minus completed minus failed is the number of publishes that died without reporting
— a killed function, a lost connection. If that number is not near zero, the problem is the
runtime, not the publish code.

## What each failure reason means, and what to do

The reasons are a closed set (`src/lib/deploy/failure.ts`). Each already has words the owner
was shown; this is the other half.

| `reason` | What the owner was told | What it means | Do |
| --- | --- | --- | --- |
| `provisioning_failed` | we could not set up a home for your site | the host refused to create the site — quota, rate limit, an outage | Check the host's status. If it is a quota, that is a configuration change and it is allowed today. |
| `upload_failed` | the address is reserved but the files did not get there | the site exists, the push failed | Their address is safe and a retry resumes. Tell them to press publish again. |
| `hosting_failed` | files are uploaded, we could not switch the site on | the last step failed | A retry is cheap and re-does nothing. If it fails twice, finish it by hand on the host. |
| `not_answering_yet` | published, still switching on | DNS | Nothing. It resolves itself on the client's next poll. |
| `nothing_to_publish` | there is nothing in this site yet | they have an empty project | Working as designed. |
| `not_paid_for` | needs to be paid for | no entitlement | Working as designed. Check the Razorpay webhook is arriving if they insist they paid. |
| `unknown` | publishing did not finish | we did not anticipate it | **This is the interesting one.** Open the Sentry issue. |

## Finding one person's publish

Every Sentry issue from a publish is tagged `boundary: publish` and `reason: <the reason>`,
and carries `projectId` and `deploymentId` as extra. From a `projectId` the history is:

```sql
select id, status, failure_reason, error, commit_sha, created_at, updated_at
  from public.deployments
 where project_id = '<projectId>'
 order by created_at desc;
```

`failure_reason` is what they were shown. `error` is the redacted provider detail and is
never shown to anybody — it is there for exactly this moment.

## Two things that will look like bugs and are not

**A person publishes twice and gets the same deployment id.** Deliberate. A second attempt
while one is in flight returns the running one rather than racing it onto the same subdomain.

**A failed publish did not take a second payment on retry.** Also deliberate, and the thing
most worth not breaking. The entitlement is read, never re-granted; three attempts leave one
row.

## What is not instrumented

Honest list, so nobody reads a green dashboard as a working product.

- **There is no dashboard page.** `src/app` has no project list, so V-7 — a failed publish
  visible without opening the project — exists as API data and no further. `ProjectSummary`
  carries `failure: { reason, what, next, retryable }`; nothing renders it yet.
- **`landing_viewed`, `signin_started` and `signin_completed` are defined and never fired.**
  Three of the eight events in the catalogue are decoration. The publish funnel is
  instrumented end to end; the funnel *into* it is not, so you cannot see how many people
  reached publish out of how many arrived.
- **No alerting.** Sentry will have the issues; nothing pages anyone.

## Live note — anything that fails in the wild

Append here as it happens. Date, what broke, what you did, whether it needs R4.

_(nothing yet — the product has not launched)_
