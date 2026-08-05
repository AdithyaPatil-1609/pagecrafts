-- Rollback for 20260805160000_entitlements.sql
drop table if exists public.entitlements cascade;
drop type if exists public.entitlement_status;
drop type if exists public.entitlement_source;
drop type if exists public.entitlement_kind;
