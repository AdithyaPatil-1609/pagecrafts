-- Restores the original D2 shape: every template must carry an absolute https URL.
--
-- This will fail if any row has a null thumbnail_url, and that is correct. You
-- cannot go back to "every design has a thumbnail" while designs have no
-- thumbnails -- reversing this means rendering them first, not inventing a URL.
-- Fill the column, then run this.

alter table public.templates
  drop constraint if exists templates_thumbnail_url_check;

alter table public.templates
  alter column thumbnail_url set not null;

alter table public.templates
  add constraint templates_thumbnail_url_check
  check (thumbnail_url ~ '^https://');
