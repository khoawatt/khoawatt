-- Impact analysis for the hard-delete pipeline (#104).
--
-- Each function returns, for a batch of ids, a jsonb report:
-- {
--   "items": [{ "id", "dependent", "external", "blocked", "resources": [paths] }],
--   "totalDependent": N, "totalExternal": M, "blockedCount": K
-- }
-- "blocked" carries a human reason when the entity may not be deleted
-- (referenced under the block strategy); "resources" lists storage paths that
-- the delete pipeline must remove AFTER the DB rows are gone.
--
-- Security invoker + owner RLS path, matching the existing cms_*_delete RPCs.

-- --- Blog posts: cascade children + optional cover object --------------------
create or replace function public.cms_analyze_delete_blog_post(p_ids text[])
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with rows as (
    select
      p.id,
      (select count(*) from public.blog_post_translations t where t.post_id = p.id)
        + (select count(*) from public.blog_post_tags lt where lt.post_id = p.id)
        as dependent,
      case when p.cover_bucket_path is not null then 1 else 0 end as external,
      null::text as blocked,
      case when p.cover_bucket_path is not null
        then jsonb_build_array(p.cover_bucket_path) else '[]'::jsonb end as resources
    from public.blog_posts p
    where p.id = any(p_ids)
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'dependent', dependent, 'external', external,
      'blocked', blocked, 'resources', resources)), '[]'::jsonb),
    'totalDependent', coalesce(sum(dependent), 0),
    'totalExternal', coalesce(sum(external), 0),
    'blockedCount', coalesce(count(*) filter (where blocked is not null), 0)
  )
  from rows;
$$;

-- --- Blog categories: block while any post references them -------------------
create or replace function public.cms_analyze_delete_blog_category(p_ids text[])
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with rows as (
    select
      c.id,
      0::bigint as dependent,
      0::bigint as external,
      case when refs.n > 0
        then 'Referenced by ' || refs.n || ' post(s). Remove or reassign those posts first.'
        else null end as blocked,
      '[]'::jsonb as resources
    from public.blog_categories c
    cross join lateral (
      select count(*) as n from public.blog_posts p where p.category_id = c.id
    ) refs
    where c.id = any(p_ids)
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'dependent', dependent, 'external', external,
      'blocked', blocked, 'resources', resources)), '[]'::jsonb),
    'totalDependent', coalesce(sum(dependent), 0),
    'totalExternal', coalesce(sum(external), 0),
    'blockedCount', coalesce(count(*) filter (where blocked is not null), 0)
  )
  from rows;
$$;

-- --- Blog tags: block while any post references them -------------------------
create or replace function public.cms_analyze_delete_blog_tag(p_ids text[])
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with rows as (
    select
      t.id,
      0::bigint as dependent,
      0::bigint as external,
      case when refs.n > 0
        then 'Referenced by ' || refs.n || ' post(s). Remove the tag from those posts first.'
        else null end as blocked,
      '[]'::jsonb as resources
    from public.blog_tags t
    cross join lateral (
      select count(*) as n from public.blog_post_tags lt where lt.tag_id = t.id
    ) refs
    where t.id = any(p_ids)
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'dependent', dependent, 'external', external,
      'blocked', blocked, 'resources', resources)), '[]'::jsonb),
    'totalDependent', coalesce(sum(dependent), 0),
    'totalExternal', coalesce(sum(external), 0),
    'blockedCount', coalesce(count(*) filter (where blocked is not null), 0)
  )
  from rows;
$$;

-- --- Media files: block while referenced anywhere (incl. blog covers) --------
-- Reference sources: project_media.src, resume_media thumbnails/full,
-- blog_posts.cover_bucket_path. Substring match for project/resume (their src
-- may hold full URLs); exact match for blog covers (bare storage path).
create or replace function public.cms_analyze_delete_media(p_paths text[])
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with rows as (
    select
      path,
      0::bigint as dependent,
      1::bigint as external,
      (select count(*) from public.project_media m where m.src ilike '%' || path || '%')
        + (select count(*) from public.resume_media r
            where r.thumbnail_src ilike '%' || path || '%'
               or r.full_src ilike '%' || path || '%')
        + (select count(*) from public.blog_posts b where b.cover_bucket_path = path)
        as refs,
      jsonb_build_array(path) as resources
    from unnest(p_paths) as path
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', path, 'dependent', dependent, 'external', external,
      'blocked', case when refs > 0
        then 'Referenced by ' || refs || ' location(s). Remove those references first.'
        else null end,
      'resources', resources)), '[]'::jsonb),
    'totalDependent', 0,
    'totalExternal', coalesce(sum(external), 0),
    'blockedCount', coalesce(count(*) filter (where refs > 0), 0)
  )
  from rows;
$$;

-- --- Privileges: owner-session client and service-role server path ------------
revoke all on function public.cms_analyze_delete_blog_post(text[]) from public;
revoke all on function public.cms_analyze_delete_blog_category(text[]) from public;
revoke all on function public.cms_analyze_delete_blog_tag(text[]) from public;
revoke all on function public.cms_analyze_delete_media(text[]) from public;

grant execute on function public.cms_analyze_delete_blog_post(text[]) to authenticated, service_role;
grant execute on function public.cms_analyze_delete_blog_category(text[]) to authenticated, service_role;
grant execute on function public.cms_analyze_delete_blog_tag(text[]) to authenticated, service_role;
grant execute on function public.cms_analyze_delete_media(text[]) to authenticated, service_role;