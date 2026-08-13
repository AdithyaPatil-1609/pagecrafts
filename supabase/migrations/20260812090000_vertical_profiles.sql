-- M3.9 — vertical profile cache.
--
-- A profile is a description of what a website for a kind of business needs:
-- its section recipe, art direction, vocabulary and image queries. It is derived
-- from the vertical slug alone, so it is identical for every user who asks for a
-- dental clinic — and until now every one of them paid a provider call for it.
--
-- The D11 corpus run pays for thirty profiles, and every re-run pays again. This
-- turns that into a one-off, which is what makes the "any business type" claim
-- affordable: the long tail of verticals is generated once and then read.

create table if not exists public.vertical_profiles (
  slug text primary key,
  profile jsonb not null,

  -- ai_generated is where every row starts. A human promotes a row to curated
  -- after reading it; nothing promotes itself, because "this profile has been
  -- used four hundred times" is evidence that a vertical is popular, not that
  -- its art direction is right.
  status text not null default 'ai_generated',

  usage_count integer not null default 0,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vertical_profiles_slug_check
    check (slug ~ '^[a-z][a-z0-9-]{1,40}$'),
  constraint vertical_profiles_status_check
    check (status in ('ai_generated', 'curated', 'rejected')),
  constraint vertical_profiles_usage_count_check
    check (usage_count >= 0)
);

-- Aliases live in their own table rather than as an array column so a lookup is
-- an index hit rather than a scan with an array containment operator, and so one
-- alias cannot be claimed by two verticals.
create table if not exists public.vertical_profile_aliases (
  alias text primary key,
  slug text not null references public.vertical_profiles (slug) on delete cascade,

  constraint vertical_profile_aliases_alias_check
    check (alias ~ '^[a-z][a-z0-9-]{1,40}$')
);

create index if not exists vertical_profile_aliases_slug_idx
  on public.vertical_profile_aliases (slug);

-- The curation queue: what is being used most that no one has read yet.
create index if not exists vertical_profiles_status_usage_idx
  on public.vertical_profiles (status, usage_count desc);

-- Every table in this schema that carries updated_at gets this trigger; without
-- it the column keeps its insert-time default forever and quietly reports that
-- no profile has ever been touched. `usage_count` bumps on every read, so this
-- fires often and is the column that tells a curator what changed recently.
create trigger vertical_profiles_set_updated_at
before update on public.vertical_profiles
for each row execute function public.set_updated_at();

alter table public.vertical_profiles enable row level security;
alter table public.vertical_profile_aliases enable row level security;

-- A profile is not user data — it describes a category of business, carries
-- nothing personal, and is identical for everyone. Any signed-in user may read
-- one; only the service role writes, because a write costs a provider call.
create policy vertical_profiles_read
  on public.vertical_profiles for select
  to authenticated
  using (true);

create policy vertical_profile_aliases_read
  on public.vertical_profile_aliases for select
  to authenticated
  using (true);

-- The policies above are necessary but not sufficient. RLS decides which rows a
-- role may see; a table-level GRANT decides whether it may address the table at
-- all, and `authenticated` has no default privileges in this schema — every
-- other table grants explicitly in the initial schema. Without these two lines
-- the policies are dead and a signed-in read fails on permission, not on RLS.
--
-- service_role needs nothing here: 20260805140000 sets `alter default
-- privileges ... to service_role`, which covers tables created after it. Writes
-- go through service_role, so select is all `authenticated` gets.
grant select on public.vertical_profiles to authenticated;
grant select on public.vertical_profile_aliases to authenticated;

comment on table public.vertical_profiles is
  'Cached per-vertical site recipes and art direction (M3.9). One row per business type.';
comment on column public.vertical_profiles.status is
  'ai_generated on insert. Only a human sets curated or rejected — never promoted automatically.';
comment on column public.vertical_profiles.usage_count is
  'How often this profile has been served. Ranks the curation queue; does not promote.';
comment on table public.vertical_profile_aliases is
  'Other names people type for a vertical — dentist resolves to dental-clinic.';
