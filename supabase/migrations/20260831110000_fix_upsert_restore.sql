-- Fix upserts to restore soft-deleted rows (clear deleted_at) per P1 invariant

create or replace function public.cms_upsert_skill(
  p_id text,
  p_group_key text,
  p_icon_key text,
  p_url text,
  p_order integer,
  p_featured boolean,
  p_name_en text,
  p_name_vi text,
  p_category_en text,
  p_category_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.skills (id, group_key, icon_key, url, "order", featured, deleted_at)
  values (p_id, p_group_key, p_icon_key, p_url, p_order, p_featured, null)
  on conflict (id) do update set
    group_key = excluded.group_key,
    icon_key = excluded.icon_key,
    url = excluded.url,
    "order" = excluded."order",
    featured = excluded.featured,
    deleted_at = null;

  insert into public.skill_translations (skill_id, locale, name, category)
  values
    (p_id, 'en', p_name_en, p_category_en),
    (p_id, 'vi', p_name_vi, p_category_vi)
  on conflict (skill_id, locale) do update set
    name = excluded.name,
    category = excluded.category;
end;
$$;
revoke all on function public.cms_upsert_skill(text,text,text,text,integer,boolean,text,text,text,text) from public;
grant execute on function public.cms_upsert_skill(text,text,text,text,integer,boolean,text,text,text,text) to authenticated, service_role;

create or replace function public.cms_upsert_social(
  p_id text,
  p_label text,
  p_url text,
  p_icon_key text,
  p_order integer
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.social_links (id, label, url, icon_key, "order", deleted_at)
  values (p_id, p_label, p_url, p_icon_key, p_order, null)
  on conflict (id) do update set
    label = excluded.label,
    url = excluded.url,
    icon_key = excluded.icon_key,
    "order" = excluded."order",
    deleted_at = null;
$$;
revoke all on function public.cms_upsert_social(text,text,text,text,integer) from public;
grant execute on function public.cms_upsert_social(text,text,text,text,integer) to authenticated, service_role;

create or replace function public.cms_upsert_project(
  p_id text,
  p_slug text,
  p_tech_stack jsonb,
  p_live_demo_url text,
  p_code_url text,
  p_featured boolean,
  p_order integer,
  p_status text,
  p_published boolean,
  p_title_en text,
  p_title_vi text,
  p_category_en text,
  p_category_vi text,
  p_summary_en text,
  p_summary_vi text,
  p_description_en text,
  p_description_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.projects (id, slug, tech_stack, live_demo_url, code_url, featured, "order", status, published, updated_at, deleted_at)
  values (p_id, p_slug, p_tech_stack, p_live_demo_url, p_code_url, p_featured, p_order, p_status, p_published, now(), null)
  on conflict (id) do update set
    slug = excluded.slug,
    tech_stack = excluded.tech_stack,
    live_demo_url = excluded.live_demo_url,
    code_url = excluded.code_url,
    featured = excluded.featured,
    "order" = excluded."order",
    status = excluded.status,
    published = excluded.published,
    updated_at = now(),
    deleted_at = null;

  insert into public.project_translations (project_id, locale, title, category, summary, description)
  values
    (p_id, 'en', p_title_en, p_category_en, p_summary_en, p_description_en),
    (p_id, 'vi', p_title_vi, p_category_vi, p_summary_vi, p_description_vi)
  on conflict (project_id, locale) do update set
    title = excluded.title,
    category = excluded.category,
    summary = excluded.summary,
    description = excluded.description;
end;
$$;
revoke all on function public.cms_upsert_project(text,text,jsonb,text,text,boolean,integer,text,boolean,text,text,text,text,text,text,text,text) from public;
grant execute on function public.cms_upsert_project(text,text,jsonb,text,text,boolean,integer,text,boolean,text,text,text,text,text,text,text,text) to authenticated, service_role;

create or replace function public.cms_upsert_resume_category(
  p_id text,
  p_order integer,
  p_name_en text,
  p_name_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.resume_categories (id, slug, "order", deleted_at)
  values (p_id, p_id, p_order, null)
  on conflict (id) do update set
    slug = excluded.slug,
    "order" = excluded."order",
    deleted_at = null;

  insert into public.resume_category_translations (resume_category_id, locale, name)
  values
    (p_id, 'en', p_name_en),
    (p_id, 'vi', p_name_vi)
  on conflict (resume_category_id, locale) do update set
    name = excluded.name;
end;
$$;
revoke all on function public.cms_upsert_resume_category(text,integer,text,text) from public;
grant execute on function public.cms_upsert_resume_category(text,integer,text,text) to authenticated, service_role;

create or replace function public.cms_upsert_blog_category(
  p_id text,
  p_sort_order integer,
  p_name_en text,
  p_name_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid category slug "%". Use lowercase letters, numbers, and hyphens.', p_id;
  end if;
  if btrim(p_name_en) = '' or btrim(p_name_vi) = '' then
    raise exception 'Category name is required in both en and vi.';
  end if;

  insert into public.blog_categories (id, slug, sort_order, deleted_at)
  values (p_id, p_id, p_sort_order, null)
  on conflict (id) do update set
    slug = excluded.slug,
    sort_order = excluded.sort_order,
    deleted_at = null;

  insert into public.blog_category_translations (category_id, locale, name)
  values
    (p_id, 'en', p_name_en),
    (p_id, 'vi', p_name_vi)
  on conflict (category_id, locale) do update set
    name = excluded.name;
end;
$$;
revoke all on function public.cms_upsert_blog_category(text,integer,text,text) from public;
grant execute on function public.cms_upsert_blog_category(text,integer,text,text) to authenticated, service_role;

create or replace function public.cms_upsert_blog_tag(
  p_id text,
  p_name_en text,
  p_name_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid tag slug "%". Use lowercase letters, numbers, and hyphens.', p_id;
  end if;
  if btrim(p_name_en) = '' or btrim(p_name_vi) = '' then
    raise exception 'Tag name is required in both en and vi.';
  end if;

  insert into public.blog_tags (id, slug, deleted_at)
  values (p_id, p_id, null)
  on conflict (id) do update set
    slug = excluded.slug,
    deleted_at = null;

  insert into public.blog_tag_translations (tag_id, locale, name)
  values
    (p_id, 'en', p_name_en),
    (p_id, 'vi', p_name_vi)
  on conflict (tag_id, locale) do update set
    name = excluded.name;
end;
$$;
revoke all on function public.cms_upsert_blog_tag(text,text,text) from public;
grant execute on function public.cms_upsert_blog_tag(text,text,text) to authenticated, service_role;

create or replace function public.cms_upsert_profile(
  p_id uuid,
  p_name text,
  p_short_name text,
  p_github_url text,
  p_linkedin_url text,
  p_resume_url text,
  p_phone text,
  p_email text,
  p_role_en text,
  p_role_vi text,
  p_intro_en text,
  p_intro_vi text,
  p_location_en text,
  p_location_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  insert into public.profile (id, slug, name, short_name, github_url, linkedin_url, resume_url, phone, email, updated_at, deleted_at)
  values (p_id, 'owner', p_name, p_short_name, p_github_url, p_linkedin_url, p_resume_url, p_phone, p_email, now(), null)
  on conflict (slug) do update set
    name = excluded.name,
    short_name = excluded.short_name,
    github_url = excluded.github_url,
    linkedin_url = excluded.linkedin_url,
    resume_url = excluded.resume_url,
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now(),
    deleted_at = null
  returning id into v_profile_id;

  if v_profile_id is null then
    select id into v_profile_id from public.profile where slug = 'owner';
  end if;

  insert into public.profile_translations (profile_id, locale, role, intro, location)
  values
    (v_profile_id, 'en', p_role_en, p_intro_en, p_location_en),
    (v_profile_id, 'vi', p_role_vi, p_intro_vi, p_location_vi)
  on conflict (profile_id, locale) do update set
    role = excluded.role,
    intro = excluded.intro,
    location = excluded.location;
end;
$$;
revoke all on function public.cms_upsert_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.cms_upsert_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated, service_role;
