-- templates.thumbnail_url was written on D2 as `text not null check (~ '^https://')`.
-- That encoded an assumption the product does not meet: it says every design has a
-- rendered thumbnail at a public URL the moment its row is written. None do. The
-- render pipeline is D16-D18, `public/templates/` is not a directory, and
-- lib/templates/thumbnails.ts deliberately returns null until an image exists so a
-- caller is never handed a URL that 404s.
--
-- Everything downstream already treats it as optional:
--   docs/openapi.yaml   thumbnailUrl: type [string, 'null']
--   ProjectSummary      thumbnailUrl: string | null
--   thumbnailUrlFor()   returns null until NEXT_PUBLIC_TEMPLATE_THUMBNAIL_BASE is set
--
-- So the column is the last thing insisting on a value nobody can supply, and it
-- blocks the whole library from being seeded. Null now means "not rendered yet",
-- which is true. The https rule is kept for when a URL is present -- a relative
-- path in this column would be a promise the API cannot keep.

alter table public.templates
  drop constraint if exists templates_thumbnail_url_check;

alter table public.templates
  alter column thumbnail_url drop not null;

alter table public.templates
  add constraint templates_thumbnail_url_check
  check (thumbnail_url is null or thumbnail_url ~ '^https://');

comment on column public.templates.thumbnail_url is
  'Absolute https URL of a rendered thumbnail, or null when none has been rendered. Never a relative path: the API hands this straight to callers.';
