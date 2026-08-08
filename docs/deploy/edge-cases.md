# Publish edge cases — observed D1-D5, scheduled for weeks 3-4

Risk R-22. Each item names the error code it must resolve to and the day it is
scheduled.

## 1 · Subdomain collision — OBSERVED D2
Two projects named "Raj's Bakery" both want `raj-s-bakery`.
Handled: numeric suffix, reserved names refused, non-Latin names fall back to a
valid unique slug.
Still open: the customer must be told the final address, since it may not be
what they typed. → D14, FR-084/085.

## 2 · Verification timeout — OBSERVED D3
First publish of a new site took longer than the 90-second ceiling. The upload
and settings were correct; the provider had not finished its own DNS check.
Handled: records `pending`, renders no URL.
Still open: something must re-check later, or the deployment stays pending
forever. → D16, FR-083/086, BR-18.

## 3 · Provider build queue stall — OBSERVED D3-D5, unplanned
GitHub Pages builds sat Queued for 16+ hours across three sites. No incident, no
error anywhere in our code, no support route on a free plan.
Resolved by switching provider — one adapter file, nothing else changed.
Lesson: publishing depends on provider-side infrastructure we cannot see. Any
new hosting account must be smoke-tested end to end before it is trusted.
→ operational note for the runbook; no code change.

## 4 · Partial failure — site exists, files do not
Provisioning succeeds, the upload fails. A site exists with nothing in it.
Needs: the next attempt reuses the site rather than making a second one, and the
entitlement is not consumed twice. → D18, `hosting_error`.

## 5 · Credential revoked or rotated mid-publish
The deploy token is rotated while a publish is in flight.
Needs: honest failure, and publishing resumes after rotation with no redeploy.
Rotation itself is already proven by test (D4). → D16, SEC-21, NFR-133.

## 6 · Failure after payment — not yet reachable
Publish fails once the customer has paid.
Needs: named error, entitlement retained, exactly one automatic retry, and never
a second request for money. → D14, PRD §2.7.3.

## 7 · Provider outage
The hosting provider is down.
Needs: honest failure, entitlement retained, and the rest of the product keeps
working. → D19, BR-23, FR-105.

## Contract wrinkle found while switching provider
`Deployment.commitSha` is a git-shaped name. Cloudflare has no commits, so the
field currently holds a deployment id. It works as an opaque version identifier
but the name is misleading. Suggest renaming to `versionId` at the next contract
review — not changed unilaterally, since the field is frozen (C-11).