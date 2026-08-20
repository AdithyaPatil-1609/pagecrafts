revoke update (phone, billing_line, billing_city, gstin) on public.users from authenticated;
grant update (handle, avatar_url, training_opt_in) on public.users to authenticated;

alter table public.users drop constraint if exists users_gstin_check;
alter table public.users drop constraint if exists users_billing_city_check;
alter table public.users drop constraint if exists users_billing_line_check;
alter table public.users drop constraint if exists users_phone_check;

alter table public.users
  drop column if exists gstin,
  drop column if exists billing_city,
  drop column if exists billing_line,
  drop column if exists phone;
