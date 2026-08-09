# Week 2 plan — Adhyay (R3 · Publish & Deploy)

Publishing is proven and parked. Week 2 is the version-history layer, which the
fork flow and the editor both sit on.

## D6 · isomorphic-git in the workspace
- Stage and commit a project's files on the server, return a sha
- POST /projects/{id}/commits — commit + write Pragna's mirror row
- POST /projects/{id}/restore — a NEW commit that restores an old state.
  History is append-only; we never rewrite it (E-6, V-1)

## D7 · History and the AI hook
- GET /projects/{id}/commits reading the mirror table, so history is instant
- A reusable auto-commit that snapshots state before an AI edit (V-2)
- Tests: files in == files out across commit, restore and history

## D8 · Fork (milestone D10 depends on it)
- After Pragna copies a template's files, write commit one:
  "Initial commit from template: <name>"
- Guard against double-create; partial failures must not leave half a project
- The whole fork must finish in under 2 seconds

## D9 · Publish groundwork returns
- POST /projects/{id}/publish skeleton with the entitlement check
- The deployment state machine driving a real deployments row
- Status and history endpoints

## Dependencies to line up now
- Pragna: commit-mirror table must exist before D6 afternoon
- Hanish: agree the auto-commit shape before D7
- Pragna: her fork file-copy lands D7 afternoon; my initial commit is D8 morning

## Carried into week 3
- Verification re-check for pending deployments (from the D3 timeout finding)
- The commitSha → versionId naming question