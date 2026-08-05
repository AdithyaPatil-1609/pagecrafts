# R3 data-model check — migration gaps (Day 1)

Output of the R3 Day-1 data-model review: what the schema already models correctly,
and the migrations still needed for the persistence + publish track.

## Added this pass

- **`entitlements`** table — `20260805160000_entitlements.sql`. Kinds `publish` /
  `edit_unlock` / `pro`; sources `launch_offer` / `paid` / `pro`; RLS select-own,
  server-writes only. Closes the "entitlement rows not modelled" gap (A1, Doc 22 §6).

## Aligned already (no change needed)

- `users`, `templates`, `projects`, `project_files`, `commits`, `deployments`,
  `generations`, `assets` exist with owner-scoped RLS and the indexes the contracts need.

## Open gaps (need migrations, owners noted)

1. **`deployment_status` enum is stale (Adhyay).** The DB enum is
   `('pending','live','failed')`, but the amended `DeploymentState` contract has seven
   states (`pending`, `provisioning`, `pushing`, `enabling_hosting`, `verifying`, `live`,
   `failed`). The publish state machine can't record the intermediate states until the
   enum is widened.
2. **`commits.author` is unconstrained text.** The `CommitAuthor` contract is
   `'user' | 'ai_edit' | 'system'`; the column is `text` with only a length check.
   Consider a CHECK or enum so provenance can't drift.
3. **`projects.repo_full_name` is a pre-A1 GitHub artifact.** Under platform-managed
   hosting a site lives at a `pagecraft.in` subdomain; the `Site` shape (`deploy.ts`) has
   no backing table yet. A `sites` (or `subdomain` column) migration is likely needed for
   the publish track — coordinate with Adhyay.

## Non-schema note (flag, not a migration)

- **Env var name mismatch:** `src/lib/auth/session.ts` reads
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, while `src/lib/config/env.ts` and
  `src/lib/auth/server.ts` use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Pick one so a
  single `.env.local` works everywhere.
