-- Rollback for 20260810180000_project_content_schema.sql
--
-- Dropping the column loses each project's own copy of its schema and sends content editing
-- back through source_template_id. Projects whose template has since been deleted become
-- uneditable again — that is the pre-D7 behaviour, restored, not a new fault.

alter table public.projects
  drop column if exists content_schema;
