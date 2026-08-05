insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'meera@pagecraft.test',
    crypt('pagecraft-dev-123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'arjun@pagecraft.test',
    crypt('pagecraft-dev-123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into public.templates (id, name, description, category, tags, thumbnail_url, files, content_schema, license, source_url)
values
  (
    'aaaaaaaa-0000-4000-8000-000000000001',
    'Ember',
    'A warm, dark single-page site for restaurants and cafes.',
    'restaurant',
    array['dark', 'one-page', 'warm'],
    'https://images.pagecraft.test/templates/ember.png',
    jsonb_build_object(
      'index.html', '<!doctype html><html><head><meta charset="utf-8"><title>Ember</title><link rel="stylesheet" href="styles.css"></head><body><h1>Ember Kitchen</h1><p>Wood-fired, every evening.</p></body></html>',
      'styles.css', 'body{font-family:system-ui;background:#140f0d;color:#f5ede6;margin:0;padding:4rem 2rem}h1{color:#e07a3f}'
    ),
    jsonb_build_object(
      'sections', jsonb_build_array(
        jsonb_build_object(
          'key', 'hero',
          'label', 'Hero',
          'fields', jsonb_build_array(
            jsonb_build_object('key', 'title', 'label', 'Restaurant name', 'type', 'text', 'maxLength', 60),
            jsonb_build_object('key', 'tagline', 'label', 'Tagline', 'type', 'text', 'maxLength', 120)
          )
        )
      )
    ),
    'MIT',
    'https://github.com/pagecraft/templates'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000002',
    'Slate',
    'A quiet, minimal portfolio for designers and photographers.',
    'portfolio',
    array['dark', 'minimal', 'one-page'],
    'https://images.pagecraft.test/templates/slate.png',
    jsonb_build_object(
      'index.html', '<!doctype html><html><head><meta charset="utf-8"><title>Slate</title><link rel="stylesheet" href="styles.css"></head><body><h1>Your Name</h1><p>Photographer, based somewhere.</p></body></html>',
      'styles.css', 'body{font-family:system-ui;background:#0f1115;color:#e7e9ee;margin:0;padding:4rem 2rem}h1{letter-spacing:-0.02em}'
    ),
    jsonb_build_object(
      'sections', jsonb_build_array(
        jsonb_build_object(
          'key', 'intro',
          'label', 'Introduction',
          'fields', jsonb_build_array(
            jsonb_build_object('key', 'name', 'label', 'Your name', 'type', 'text', 'maxLength', 60),
            jsonb_build_object('key', 'bio', 'label', 'Short bio', 'type', 'richtext', 'maxLength', 400),
            jsonb_build_object('key', 'accent', 'label', 'Accent colour', 'type', 'color')
          )
        )
      )
    ),
    'MIT',
    'https://github.com/pagecraft/templates'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000003',
    'Ledger',
    'A clean marketing page for small software products.',
    'saas',
    array['light', 'marketing', 'multi-section'],
    'https://images.pagecraft.test/templates/ledger.png',
    jsonb_build_object(
      'index.html', '<!doctype html><html><head><meta charset="utf-8"><title>Ledger</title><link rel="stylesheet" href="styles.css"></head><body><h1>Ship faster</h1><ul></ul></body></html>',
      'styles.css', 'body{font-family:system-ui;background:#ffffff;color:#111827;margin:0;padding:4rem 2rem}h1{font-size:2.5rem}'
    ),
    jsonb_build_object(
      'sections', jsonb_build_array(
        jsonb_build_object(
          'key', 'hero',
          'label', 'Hero',
          'fields', jsonb_build_array(
            jsonb_build_object('key', 'headline', 'label', 'Headline', 'type', 'text', 'maxLength', 80)
          )
        ),
        jsonb_build_object(
          'key', 'features',
          'label', 'Features',
          'fields', jsonb_build_array(
            jsonb_build_object(
              'key', 'items',
              'label', 'Feature list',
              'type', 'list',
              'itemSchema', jsonb_build_array(
                jsonb_build_object('key', 'title', 'label', 'Title', 'type', 'text', 'maxLength', 60),
                jsonb_build_object('key', 'body', 'label', 'Description', 'type', 'text', 'maxLength', 200)
              )
            )
          )
        )
      )
    ),
    'CC-BY-4.0',
    'https://github.com/pagecraft/templates'
  )
on conflict (id) do nothing;

insert into public.projects (id, user_id, name, source_template_id, content_json, site_meta)
values
  (
    'bbbbbbbb-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Meera Bakes',
    'aaaaaaaa-0000-4000-8000-000000000001',
    jsonb_build_object(
      'hero', jsonb_build_object('title', 'Meera Bakes', 'tagline', 'Sourdough, every morning.')
    ),
    jsonb_build_object('title', 'Meera Bakes', 'description', 'A small bakery in Pune.')
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Arjun Studio',
    'aaaaaaaa-0000-4000-8000-000000000002',
    jsonb_build_object(
      'intro', jsonb_build_object('name', 'Arjun Rao', 'bio', 'Photographer, based in Goa.')
    ),
    jsonb_build_object('title', 'Arjun Rao', 'description', 'Selected work.')
  )
on conflict (id) do nothing;

insert into public.project_files (project_id, path, content)
values
  (
    'bbbbbbbb-0000-4000-8000-000000000001',
    'index.html',
    '<!doctype html><html><head><meta charset="utf-8"><title>Meera Bakes</title><link rel="stylesheet" href="styles.css"></head><body><h1>Meera Bakes</h1><p>Sourdough, every morning.</p></body></html>'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000001',
    'styles.css',
    'body{font-family:system-ui;background:#140f0d;color:#f5ede6;margin:0;padding:4rem 2rem}h1{color:#e07a3f}'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    'index.html',
    '<!doctype html><html><head><meta charset="utf-8"><title>Arjun Rao</title><link rel="stylesheet" href="styles.css"></head><body><h1>Arjun Rao</h1><p>Photographer, based in Goa.</p></body></html>'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    'styles.css',
    'body{font-family:system-ui;background:#0f1115;color:#e7e9ee;margin:0;padding:4rem 2rem}'
  )
on conflict (project_id, path) do nothing;

insert into public.commits (project_id, sha, message, author)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', 'Create site from Ember', 'system'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1', 'Create site from Slate', 'system')
on conflict (project_id, sha) do nothing;
