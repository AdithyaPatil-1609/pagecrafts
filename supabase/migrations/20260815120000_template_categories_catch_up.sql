-- Bring template_category back in line with the Category type.
--
-- The enum has fallen behind the code twice now. It was closed once at
-- 20260809130000_template_categories.sql, and four template batches have landed since,
-- each adding the buckets its tiles were labelled with. Fifteen values exist in
-- src/lib/discovery/categories.ts and not in the database:
--
--   hospitality automotive media sports health_wellness pets arts_culture retail
--   finance wellness health creative technology professional personal
--
-- Nothing is broken while the library is a TypeScript module, because nothing inserts a
-- template row. It breaks the first time one does: every design outside the enum is
-- rejected on insert, and the failure lands on whoever is seeding the table rather than on
-- whoever added the category.
--
-- tests/unit/template-categories.test.ts now compares the two and fails when they diverge,
-- so this is the last time the gap has to be found by reading.
--
-- Additive only. No value is renamed or removed, so nothing already stored changes meaning.

alter type public.template_category add value if not exists 'hospitality';
alter type public.template_category add value if not exists 'automotive';
alter type public.template_category add value if not exists 'media';
alter type public.template_category add value if not exists 'sports';
alter type public.template_category add value if not exists 'health_wellness';
alter type public.template_category add value if not exists 'pets';
alter type public.template_category add value if not exists 'arts_culture';
alter type public.template_category add value if not exists 'retail';
alter type public.template_category add value if not exists 'finance';
alter type public.template_category add value if not exists 'wellness';
alter type public.template_category add value if not exists 'health';
alter type public.template_category add value if not exists 'creative';
alter type public.template_category add value if not exists 'technology';
alter type public.template_category add value if not exists 'professional';
alter type public.template_category add value if not exists 'personal';

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
