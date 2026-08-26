-- media_assets RLS verification (#102), following the role + JWT claims pattern.
--
-- Contract: owner-only. The owner can manage their catalog rows; anon has zero
-- table privileges (no policy, no grants).

begin;
select plan(5);

-- --- Owner: insert + select + update + delete ------------------------------
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
  $$ insert into public.media_assets (bucket, path, title, alt_en, alt_vi, width, height, size_bytes, mime)
     values ('blog-media', 'rls-test.png', 'RLS Test', 'alt en', 'alt vi', 100, 80, 1200, 'image/png') $$,
  'owner can insert a catalog row'
);

select is(
  (select title from public.media_assets
    where bucket = 'blog-media' and path = 'rls-test.png'),
  'RLS Test',
  'owner can select catalog rows'
);

select lives_ok(
  $$ update public.media_assets set title = 'RLS Test Updated'
     where bucket = 'blog-media' and path = 'rls-test.png' $$,
  'owner can update a catalog row'
);

select lives_ok(
  $$ delete from public.media_assets
     where bucket = 'blog-media' and path = 'rls-test.png' $$,
  'owner can delete a catalog row'
);

-- --- Anonymous: zero privileges ---------------------------------------------
set local role anon;

select throws_ok(
  $$ select count(*) from public.media_assets $$,
  42501,
  NULL,
  'anon cannot select catalog rows'
);

rollback;