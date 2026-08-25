-- Blog schema verification for Issue #89 (slice 1).
--
-- Exercises the atomic-mutation RPCs (publish gate, published_at stamping,
-- update invariants, slug/tag validation, reference-blocked deletion) and RLS
-- (owner / non-owner / anonymous), following the same role + JWT claims pattern
-- as rls_crud_test.sql. The owner auth_uid is read from the seeded admin_owner
-- row so the test adapts to whichever auth user is the configured single owner.

begin;
select plan(35);

-- Capture the owner uid, then set claims as the owner.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select auth_uid from public.admin_owner limit 1)::text,
    'role', 'authenticated'
  )::text,
  false
);

set local role authenticated;

-- --- Seed sanity --------------------------------------------------------------
select is(
  (select count(*) from public.blog_categories),
  3::bigint,
  'seed: 3 starter categories'
);

select is(
  (select count(*) from public.blog_tags),
  6::bigint,
  'seed: 6 demo tags'
);

-- --- Owner RPC creates (categories / tags) ------------------------------------
select lives_ok(
  $$ select public.cms_upsert_blog_category('test-cat', 99, 'Test Category', 'Danh mục kiểm thử') $$,
  'owner can create a blog category via RPC'
);

select lives_ok(
  $$ select public.cms_upsert_blog_tag('test-tag', 'Test Tag', 'Thẻ kiểm thử') $$,
  'owner can create a blog tag via RPC'
);

-- --- Publish gate: draft path -------------------------------------------------
select lives_ok(
  $$ select public.cms_upsert_blog_post('post-a', 'post-a', 'test-cat', null, 'draft', array['test-tag'], 'Title A', 'Summary A', 'Content A', 'Tiêu đề A', 'Tóm tắt A', '') $$,
  'draft post may keep content_md empty'
);

select is(
  (select status from public.blog_posts where id = 'post-a'),
  'draft',
  'post-a is draft after create'
);

select is(
  (select published_at from public.blog_posts where id = 'post-a'),
  null,
  'draft post has null published_at'
);

-- --- Publish gate: rejections -------------------------------------------------
select throws_ok(
  $$ select public.cms_upsert_blog_post('post-b', 'post-b', 'test-cat', null, 'published', null, 'Title B', 'Summary B', 'Content B', 'Tiêu đề B', 'Tóm tắt B', '') $$,
  null,
  'Cannot publish: missing required translation(s): content (vi)',
  'publish gate rejects empty vi content'
);

select throws_ok(
  $$ select public.cms_upsert_blog_post('post-c', 'post-c', 'test-cat', null, 'published', null, 'Title C', 'Summary C', 'Content C', '', 'Tóm tắt C', 'Nội dung C') $$,
  null,
  'Cannot publish: missing required translation(s): title (vi)',
  'publish gate rejects empty vi title'
);

select throws_ok(
  $$ select public.cms_upsert_blog_post('post-d', 'post-d', 'does-not-exist', null, 'published', null, 'T', 'S', 'C', 'T', 'S', 'C') $$,
  null,
  'Cannot publish: category "does-not-exist" does not exist.',
  'publish gate rejects unknown category'
);

select throws_ok(
  $$ select public.cms_upsert_blog_post('post-e', 'post-e', 'test-cat', null, 'live', null, 'T', 'S', 'C', 'T', 'S', 'C') $$,
  null,
  'Invalid status "live". Must be draft or published.',
  'invalid status is rejected'
);

select throws_ok(
  $$ select public.cms_upsert_blog_post('post-f', 'Bad Slug!', 'test-cat', null, 'draft', null, 'T', 'S', 'C', 'T', 'S', 'C') $$,
  null,
  'Invalid slug "Bad Slug!". Use lowercase letters, numbers, and hyphens.',
  'invalid slug format is rejected'
);

select throws_ok(
  $$ select public.cms_upsert_blog_post('post-g', 'post-g', 'test-cat', null, 'draft', array['nope'], 'T', 'S', 'C', 'T', 'S', 'C') $$,
  null,
  'One or more tag ids do not exist.',
  'unknown tag id is rejected'
);

-- --- Publish lifecycle ---------------------------------------------------------
select lives_ok(
  $$ select public.cms_upsert_blog_post('post-a', 'post-a', 'test-cat', null, 'published', array['test-tag'], 'Title A', 'Summary A', 'Content A', 'Tiêu đề A', 'Tóm tắt A', 'Nội dung A') $$,
  'publishing a complete post succeeds'
);

select isnt(
  (select published_at from public.blog_posts where id = 'post-a'),
  null,
  'first publish stamps published_at'
);

-- Capture published_at before the edit round.
create temp table _cap as
  select published_at from public.blog_posts where id = 'post-a';

select lives_ok(
  $$ select public.cms_upsert_blog_post('post-a', 'post-a', 'test-cat', null, 'published', array['test-tag'], 'Title A v2', 'Summary A', 'Content A', 'Tiêu đề A', 'Tóm tắt A', 'Nội dung A') $$,
  'editing a published post (kept published) succeeds'
);

select is(
  (select published_at from public.blog_posts where id = 'post-a'),
  (select published_at from _cap),
  'editing a published post does not alter published_at'
);

select lives_ok(
  $$ select public.cms_upsert_blog_post('post-a', 'post-a', 'test-cat', null, 'draft', array['test-tag'], 'Title A', 'Summary A', 'Content A', 'Tiêu đề A', 'Tóm tắt A', 'Nội dung A') $$,
  'unpublishing a published post is always allowed'
);

select is(
  (select status from public.blog_posts where id = 'post-a'),
  'draft',
  'post-a is draft after unpublish'
);

select lives_ok(
  $$ select public.cms_upsert_blog_post('post-a', 'post-a', 'test-cat', null, 'published', array['test-tag'], 'Title A', 'Summary A', 'Content A', 'Tiêu đề A', 'Tóm tắt A', 'Nội dung A') $$,
  're-publishing a post succeeds'
);

select is(
  (select published_at from public.blog_posts where id = 'post-a'),
  (select published_at from _cap),
  're-publish preserves the original published_at'
);

select is(
  (select count(*) from public.blog_post_tags where post_id = 'post-a'),
  1::bigint,
  'post tag links are written'
);

-- --- Slug / reference validation ----------------------------------------------
select throws_ok(
  $$ select public.cms_upsert_blog_post('post-h', 'post-a', 'test-cat', null, 'draft', null, 'T', 'S', 'C', 'T', 'S', 'C') $$,
  null,
  'Slug "post-a" is already in use by another post.',
  'slug collision across posts is rejected'
);

select throws_ok(
  $$ select public.cms_delete_blog_category('test-cat') $$,
  null,
  'Category "test-cat" cannot be deleted while posts reference it.',
  'deleting a referenced category is blocked'
);

select throws_ok(
  $$ select public.cms_delete_blog_tag('test-tag') $$,
  null,
  'Tag "test-tag" cannot be deleted while posts reference it.',
  'deleting a referenced tag is blocked'
);

-- --- Owner direct INSERT (RLS with-check) -------------------------------------
select lives_ok(
  $$ insert into public.blog_tags (id, slug) values ('owner-direct', 'owner-direct') $$,
  'owner can INSERT directly into blog_tags'
);

-- --- Cleanup via RPC, then unreferenced deletes --------------------------------
select lives_ok(
  $$ select public.cms_delete_blog_post('post-a') $$,
  'owner can delete a post via RPC'
);

select lives_ok(
  $$ select public.cms_delete_blog_category('test-cat') $$,
  'deleting an unreferenced category succeeds'
);

select lives_ok(
  $$ select public.cms_delete_blog_tag('test-tag') $$,
  'deleting an unreferenced tag succeeds'
);

select lives_ok(
  $$ delete from public.blog_tags where id = 'owner-direct' $$,
  'owner can DELETE blog_tags directly'
);

select is(
  (select count(*) from public.blog_categories),
  3::bigint,
  'owner can SELECT blog_categories (seeds remain)'
);

-- --- Non-owner authenticated: denied by RLS (owner-only policy) ----------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.blog_posts),
  0::bigint,
  'non-owner sees zero blog_posts rows (RLS filters)'
);

select is(
  (select count(*) from public.blog_categories),
  0::bigint,
  'non-owner sees zero blog_categories rows (RLS filters)'
);

select throws_ok(
  $$ insert into public.blog_tags (id, slug) values ('intruder', 'intruder') $$,
  null,
  null,
  'non-owner cannot INSERT into blog_tags (RLS with-check)'
);

-- --- Anonymous: denied (zero privileges, deny-by-default) ----------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  $$ select * from public.blog_posts $$,
  null,
  'permission denied for table blog_posts',
  'anonymous cannot SELECT blog_posts'
);

select * from finish();
rollback;