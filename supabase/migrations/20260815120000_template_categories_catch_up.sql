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
