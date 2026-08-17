-- Bring template_category in line with the rest of Category / CATEGORY_IDS.
--
-- 20260809130000 added the R2 library-refresh buckets through entertainment.
-- Later batches added hospitality, automotive, media, sports, health_wellness,
-- pets, arts_culture, retail, finance, wellness, health, creative, technology,
-- professional and personal. The TypeScript type already has them; the enum
-- does not. Seeding the library (and forking a design that uses one of those
-- buckets) fails with `invalid input value for enum template_category`.
--
-- Additive only. No value is renamed or removed.

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
