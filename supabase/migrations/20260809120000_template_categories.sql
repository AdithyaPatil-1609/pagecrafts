-- Bring template_category in line with the Category type.
--
-- The enum has held the original ten since the initial schema, while the TypeScript
-- Category grew twice: seven buckets in the R2 library refresh (fitness, food, photography,
-- architecture, education, travel, business), and six more with designs 13-24, each because
-- a tile in that batch is labelled with it and no existing bucket carried that label — a
-- salon is not "Other" and a dental clinic is not "Business".
--
-- Nothing is broken today because the library is a TypeScript module and the table is not
-- yet its source. It breaks the moment it is: every design outside the original ten would
-- be rejected on insert. Adding the values now costs nothing and removes that landmine
-- before the fork flow starts reading templates from here (R3 D7).
--
-- Additive only. No value is renamed or removed, so nothing already stored changes meaning.

alter type public.template_category add value if not exists 'fitness';
alter type public.template_category add value if not exists 'food';
alter type public.template_category add value if not exists 'photography';
alter type public.template_category add value if not exists 'architecture';
alter type public.template_category add value if not exists 'education';
alter type public.template_category add value if not exists 'travel';
alter type public.template_category add value if not exists 'business';

alter type public.template_category add value if not exists 'beauty';
alter type public.template_category add value if not exists 'real_estate';
alter type public.template_category add value if not exists 'healthcare';
alter type public.template_category add value if not exists 'design';
alter type public.template_category add value if not exists 'professional_services';
alter type public.template_category add value if not exists 'entertainment';
