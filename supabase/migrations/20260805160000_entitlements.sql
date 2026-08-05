-- Entitlements: what a user has paid for or been granted (A-5, Doc 22 §6, Amendment A1).
-- Publishing is gated on these, never on an external account. Entitlement state is
-- server-side: clients may only READ their own rows; grants are written by the server
-- (service role) after payment / launch-offer / Pro activation, so a client can never
-- self-grant and a paid publish never re-charges on retry.

create type public.entitlement_kind as enum ('publish', 'edit_unlock', 'pro');
create type public.entitlement_source as enum ('launch_offer', 'paid', 'pro');
create type public.entitlement_status as enum ('active', 'expired', 'revoked');

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind public.entitlement_kind not null,
  source public.entitlement_source not null,
  status public.entitlement_status not null default 'active',
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  -- pro is per-user (no project); publish and edit_unlock are per-project.
  check (
    (kind = 'pro' and project_id is null)
    or (kind in ('publish', 'edit_unlock') and project_id is not null)
  )
);

-- One publish and one edit_unlock entitlement per project; one pro per user.
create unique index entitlements_project_kind_idx
  on public.entitlements (project_id, kind)
  where project_id is not null;
create unique index entitlements_user_pro_idx
  on public.entitlements (user_id)
  where kind = 'pro';

create index entitlements_user_id_idx on public.entitlements (user_id);
create index entitlements_project_id_idx on public.entitlements (project_id);

create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

-- RLS auto-enables via the event trigger; enable explicitly too for clarity.
alter table public.entitlements enable row level security;

-- Clients may read their own entitlements (to show their plan); they may not write them.
grant select on public.entitlements to authenticated;

create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = auth.uid());
