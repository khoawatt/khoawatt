-- media_assets RLS verification (#102), following the role + JWT claims
-- pattern of blog_schema_test.sql / rls_crud_test.sql.
--
-- Contract: the catalog is admin-only. The anonymous role has zero table
-- privileges (SELECT revoked outright, writes refused); the configured owner
-- can insert/select/update/delete. Unknown buckets are rejected by a CHECK.

begin;
select plan(8);

-- --- Owner: full CRUD ---------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select auth_uid from public.admin_owner limit 1)::text,
    'role', 'authenticated'
  )::text,
  false
);

set local role authenticated;

select lives_ok(
  $$ insert into public.media_assets
       (bucket, path, title, alt_en, alt_vi, width, height, size_bytes, mime)
     values ('blog-media', 'rls-test.png', 'RLS test', 'alt en', 'alt vi', 2, 1, 10, 'image/png') $$,
  'owner can insert a catalog row'
);

select is(
  (select title from public.media_assets
    where bucket = 'blog-media' and path = 'rls-test.png'),
  'RLS test',
  'owner reads back the inserted row'
);

select lives_ok(
  $$ update public.media_assets set alt_en = 'edited'
     where bucket = 'blog-media' and path = 'rls-test.png' $$,
  'owner can edit metadata'
);

select is(
  (select alt_en from public.media_assets
    where bucket = 'blog-media' and path = 'rls-test.png'),
  'edited',
  'metadata edit persists'
);

select lives_ok(
  $$ delete from public.media_assets
     where bucket = 'blog-media' and path = 'rls-test.png' $$,
  'owner can delete the row'
);

select throws_ok(
  $$ insert into public.media_assets (bucket, path, title)
     values ('not-a-bucket', 'x.png', 'bad bucket') $$,
  NULL,
  NULL,
  'unknown buckets are rejected by the check constraint'
);

-- --- Anonymous: zero table privileges ----------------------------------------
set local role anon;

select throws_ok(
  $$ select count(*) from public.media_assets $$,
  42501,
  NULL,
  'anon cannot select from the catalog at all'
);

select throws_ok(
  $$ insert into public.media_assets (bucket, path, title)
     values ('blog-media', 'anon.png', 'nope') $$,
  42501,
  NULL,
  'anon cannot insert into the catalog'
);

rollback;
