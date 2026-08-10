-- R3 D8 — the database learns what a design costs.
--
-- Tier lived only in lib/templates/designs.ts, which is fine for putting a price on a tile
-- and useless for enforcing one. `POST /projects` had no way to ask "is this design paid?"
-- short of trusting the caller, and a paywall the client is trusted to declare is not a
-- paywall. Doc 22 P2/P3 puts payment before the fork, so the fork is where the answer has
-- to be available, on the server, from the row itself.
--
-- Default 'free' so existing rows stay legal; the seed writes the real value for each
-- design and re-running it corrects any that change.

create type public.template_tier as enum ('free', 'premium', 'signature');

alter table public.templates
  add column if not exists tier public.template_tier not null default 'free';

-- The gallery sorts and filters on tier, and the fork check reads it on every paid fork.
create index if not exists templates_tier_idx on public.templates (tier);
