create extension if not exists pgcrypto;

create type public.template_category as enum (
  'portfolio',
  'restaurant',
  'saas',
  'blog',
  'event',
  'resume',
  'agency',
  'store',
  'nonprofit',
  'other'
);

create type public.deployment_status as enum ('pending', 'live', 'failed');
create type public.generation_status as enum ('completed', 'failed', 'rejected');
create type public.asset_kind as enum ('image', 'favicon', 'og_image');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email) and length(email) <= 320),
  email_verified boolean not null default false,
  github_id text unique,
  handle text,
  avatar_url text,
  encrypted_token text,
  training_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  description text not null check (char_length(description) <= 300),
  category public.template_category not null,
  tags text[] not null default '{}'::text[],
  thumbnail_url text not null check (thumbnail_url ~ '^https://'),
  files jsonb not null,
  content_schema jsonb not null,
  license text not null check (length(trim(license)) > 0),
  source_url text not null check (length(trim(source_url)) > 0 and source_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  source_template_id uuid references public.templates(id) on delete set null,
  content_json jsonb not null default '{}'::jsonb,
  site_meta jsonb not null default '{}'::jsonb,
  form_endpoint text check (form_endpoint is null or form_endpoint ~ '^https://'),
  repo_full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null check (path !~ '^/' and path !~ '(^|/)\.\.(/|$)' and position(chr(0) in path) = 0),
  content text not null,
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create table public.commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sha text not null check (sha ~ '^[0-9a-f]{7,40}$'),
  message text not null check (char_length(message) between 1 and 500),
  author text not null check (char_length(author) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (project_id, sha)
);

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  repo_url text check (repo_url is null or repo_url ~ '^https://'),
  live_url text check (live_url is null or live_url ~ '^https://'),
  status public.deployment_status not null default 'pending',
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,40}$'),
  error text,
  created_at timestamptz not null default now(),
  check (status <> 'live' or live_url is not null)
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  prompt text,
  prompt_hash text,
  model text not null check (char_length(model) between 1 and 120),
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  cost_cents numeric(10, 4) not null default 0 check (cost_cents >= 0),
  status public.generation_status not null,
  created_at timestamptz not null default now(),
  check (prompt is not null or prompt_hash is not null)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique check (storage_path !~ '^/' and position(chr(0) in storage_path) = 0),
  kind public.asset_kind not null default 'image',
  mime_type text not null check (mime_type ~ '^image/'),
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  source_url text check (source_url is null or source_url ~ '^https://'),
  attribution jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index projects_user_id_updated_at_idx on public.projects (user_id, updated_at desc);
create index project_files_project_id_idx on public.project_files (project_id);
create index commits_project_id_created_at_idx on public.commits (project_id, created_at desc);
create index deployments_project_id_created_at_idx on public.deployments (project_id, created_at desc);
create index generations_user_id_created_at_idx on public.generations (user_id, created_at desc);
create index generations_created_at_idx on public.generations (created_at);
create index assets_project_id_idx on public.assets (project_id);
create index templates_category_idx on public.templates (category);
create index templates_tags_idx on public.templates using gin (tags);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, email_verified)
  values (new.id, lower(new.email), new.email_confirmed_at is not null)
  on conflict (id) do update
  set email = excluded.email,
      email_verified = excluded.email_verified;
  return new;
end;
$$;

create function public.enforce_project_file_limits()
returns trigger
language plpgsql
as $$
declare
  next_file_count integer;
  next_content_size bigint;
begin
  select count(*), coalesce(sum(octet_length(content)), 0)
  into next_file_count, next_content_size
  from public.project_files
  where project_id = new.project_id
    and id <> coalesce(new.id, gen_random_uuid());

  if next_file_count + 1 > 50 then
    raise exception 'Project file limit exceeded';
  end if;

  if next_content_size + octet_length(new.content) > 2097152 then
    raise exception 'Project text size limit exceeded';
  end if;

  return new;
end;
$$;

create function public.enforce_project_asset_limit()
returns trigger
language plpgsql
as $$
declare
  next_asset_size bigint;
begin
  select coalesce(sum(byte_size), 0)
  into next_asset_size
  from public.assets
  where project_id = new.project_id
    and id <> coalesce(new.id, gen_random_uuid());

  if next_asset_size + new.byte_size > 26214400 then
    raise exception 'Project asset size limit exceeded';
  end if;

  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.create_user_profile();

create trigger auth_user_profile_updated
after update of email, email_confirmed_at on auth.users
for each row execute function public.create_user_profile();

create trigger project_files_enforce_limits
before insert or update of project_id, content on public.project_files
for each row execute function public.enforce_project_file_limits();

create trigger assets_enforce_limit
before insert or update of project_id, byte_size on public.assets
for each row execute function public.enforce_project_asset_limit();

alter table public.users enable row level security;
alter table public.templates enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.commits enable row level security;
alter table public.deployments enable row level security;
alter table public.generations enable row level security;
alter table public.assets enable row level security;

grant usage on schema public to authenticated;

grant select on public.users to authenticated;
grant update (handle, avatar_url, training_opt_in) on public.users to authenticated;
grant select on public.templates to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_files to authenticated;
grant select, insert on public.commits to authenticated;
grant select, insert on public.deployments to authenticated;
grant select, insert on public.generations to authenticated;
grant select, insert, update, delete on public.assets to authenticated;

create policy users_select_own on public.users for select to authenticated using (id = auth.uid());
create policy users_update_own on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy templates_select_authenticated on public.templates for select to authenticated using (true);
create policy projects_select_own on public.projects for select to authenticated using (user_id = auth.uid());
create policy projects_insert_own on public.projects for insert to authenticated with check (user_id = auth.uid());
create policy projects_update_own on public.projects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy projects_delete_own on public.projects for delete to authenticated using (user_id = auth.uid());
create policy project_files_select_own on public.project_files for select to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy project_files_insert_own on public.project_files for insert to authenticated with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy project_files_update_own on public.project_files for update to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid())) with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy project_files_delete_own on public.project_files for delete to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy commits_select_own on public.commits for select to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy commits_insert_own on public.commits for insert to authenticated with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy deployments_select_own on public.deployments for select to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy deployments_insert_own on public.deployments for insert to authenticated with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy generations_select_own on public.generations for select to authenticated using (user_id = auth.uid());
create policy generations_insert_own on public.generations for insert to authenticated with check (user_id = auth.uid());
create policy assets_select_own on public.assets for select to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy assets_insert_own on public.assets for insert to authenticated with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy assets_update_own on public.assets for update to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid())) with check (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy assets_delete_own on public.assets for delete to authenticated using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-assets', 'project-assets', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy project_assets_select_own on storage.objects for select to authenticated using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy project_assets_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy project_assets_update_own on storage.objects for update to authenticated using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy project_assets_delete_own on storage.objects for delete to authenticated using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);
