alter table public.assets
  drop constraint if exists assets_storage_path_check;

alter table public.assets
  add constraint assets_storage_path_check
  check (storage_path !~ '^/' and position(chr(0) in storage_path) = 0);

alter table public.project_files
  drop constraint if exists project_files_path_check;

alter table public.project_files
  add constraint project_files_path_check
  check (path !~ '^/' and path !~ '(^|/)\.\.(/|$)' and position(chr(0) in path) = 0);
