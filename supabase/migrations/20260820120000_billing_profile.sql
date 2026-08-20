-- Billing profile for receipts when someone buys a look.
-- Card and bank numbers stay with Razorpay. We only keep the name and address
-- that belong on an invoice.

alter table public.users
  add column if not exists phone text,
  add column if not exists billing_line text,
  add column if not exists billing_city text,
  add column if not exists gstin text;

alter table public.users
  drop constraint if exists users_phone_check;
alter table public.users
  add constraint users_phone_check
  check (phone is null or char_length(phone) <= 20);

alter table public.users
  drop constraint if exists users_billing_line_check;
alter table public.users
  add constraint users_billing_line_check
  check (billing_line is null or char_length(billing_line) <= 120);

alter table public.users
  drop constraint if exists users_billing_city_check;
alter table public.users
  add constraint users_billing_city_check
  check (billing_city is null or char_length(billing_city) <= 80);

alter table public.users
  drop constraint if exists users_gstin_check;
alter table public.users
  add constraint users_gstin_check
  check (gstin is null or char_length(gstin) <= 15);

grant update (handle, avatar_url, training_opt_in, phone, billing_line, billing_city, gstin)
  on public.users to authenticated;

comment on column public.users.phone is 'Contact number for receipts. Never a card or bank account.';
comment on column public.users.billing_line is 'Street or locality printed on a bill.';
comment on column public.users.billing_city is 'City printed on a bill.';
comment on column public.users.gstin is 'Optional GSTIN for a business invoice.';
