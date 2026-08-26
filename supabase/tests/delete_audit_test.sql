-- delete_audit RLS verification (#104), following the role + JWT claims pattern.
--
-- Contract: append-only. The owner can INSERT and SELECT; nobody (including
-- the owner) can UPDATE or DELETE through RLS — there are simply no policies
-- for those verbs. The anonymous role has zero table privileges.

begin;
select plan(6);

-- --- Owner: insert + select ------------------------------------------------
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
  $$ insert into public.delete_audit
       (entity_type, entity_id, deleted_by, impact, cleanup, result)
     values ('blog_post', 'audit-test', (select auth_uid from public.admin_owner limit 1),
             '{"dependent": 2}'::jsonb, '["cover.png"]'::jsonb, 'success') $$,
  'owner can insert an audit row'
);

select is(
  (select count(*) from public.delete_audit
    where entity_type = 'blog_post' and entity_id = 'audit-test'),
  1::bigint,
  'owner can select audit rows'
);

-- --- No update/delete policy exists for anyone -----------------------------
select throws_ok(
  $$ update public.delete_audit set result = 'failed'
     where entity_id = 'audit-test' $$,
  42501,
  NULL,
  'owner cannot update an audit row (no policy)'
);

select throws_ok(
  $$ delete from public.delete_audit where entity_id = 'audit-test' $$,
  42501,
  NULL,
  'owner cannot delete an audit row (no policy)'
);

-- --- Anonymous: zero privileges ---------------------------------------------
set local role anon;

select throws_ok(
  $$ select count(*) from public.delete_audit $$,
  42501,
  NULL,
  'anon cannot select audit rows'
);

select throws_ok(
  $$ insert into public.delete_audit
       (entity_type, entity_id, deleted_by, result)
     values ('blog_post', 'x', (select auth_uid from public.admin_owner limit 1), 'success') $$,
  42501,
  NULL,
  'anon cannot insert audit rows'
);

rollback;