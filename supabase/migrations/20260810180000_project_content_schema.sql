-- R3 D7 — a project owns its content schema, rather than borrowing the template's.
--
-- createProject already copies the template's *files* into the project, and says why in its
-- own comment: "a copy, never a reference, so editing a project can never change the
-- template or another project made from it". The schema was the exception. It was read
-- live, through source_template_id, every time someone edited content.
--
-- Two ways that bites, neither of them rare:
--
--   source_template_id is `on delete set null`. Retire a design and every project ever made
--   from it loses the link, and with it the answer to "what fields does this site have?".
--   The site keeps rendering — the files were copied — but its owner can never edit a word
--   of it again. Deleting a row from a library table should not reach into someone's site.
--
--   A template's content_schema is not frozen either. Re-normalising a design, or shipping a
--   corrected schema, silently changes what every existing project validates against, while
--   their files still hold the old shape.
--
-- The column is `not null default '{}'` so existing rows stay legal while the backfill runs
-- and so a project made without a template (the generation path) simply has an empty schema
-- rather than a null nobody remembered to check.

alter table public.projects
  add column if not exists content_schema jsonb not null default '{}'::jsonb;

-- Existing projects: take the schema their template has now. It is the best available
-- answer and it is what they were already validating against a moment ago, so nothing
-- changes for them today. Projects whose template has already been deleted keep '{}' —
-- there is nothing left to copy, which is precisely the damage this column prevents from
-- happening again.
update public.projects p
   set content_schema = t.content_schema
  from public.templates t
 where p.source_template_id = t.id
   and p.content_schema = '{}'::jsonb
   and t.content_schema is not null;
