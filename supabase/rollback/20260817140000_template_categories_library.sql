-- Inverse of 20260817140000_template_categories_library.sql.
-- Postgres cannot drop enum values that may already be stored. This file exists
-- so the rollback folder stays complete; applying it is a no-op besides a notice.

do $$
begin
  raise notice 'template_category values added in 20260817140000 cannot be dropped safely.';
end $$;
