-- Issue #20 review follow-up (request-changes):
-- Route admin Profile/Social/Skills reads and mutations through the
-- authenticated owner/RLS path. The previous migration made the atomic RPCs
-- SECURITY DEFINER and executable by service_role only, which bypasses RLS.
-- This migration converts them to SECURITY INVOKER (they then run with the
-- caller's role, so the RLS policies on the content tables are evaluated) and
-- grants execute to `authenticated`. Server actions now call them through the
-- authenticated server client, so the owner JWT is present and RLS is the
-- authoritative check for each mutation.
--
-- The public runtime read path (app_settings, publicity) is unchanged: it stays
-- on the narrow service-role path per the accepted #18 design.

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
  insert into public.skills (id, group_key, icon_key, url, "order", featured)
  values (p_id, p_group_key, p_icon_key, p_url, p_order, p_featured)
  on conflict (id) do update set
    group_key = excluded.group_key,
    icon_key = excluded.icon_key,
    url = excluded.url,
    "order" = excluded."order",
    featured = excluded.featured;

  insert into public.skill_translations (skill_id, locale, name, category)
  values
    (p_id, 'en', p_name_en, p_category_en),
    (p_id, 'vi', p_name_vi, p_category_vi)
  on conflict (skill_id, locale) do update set
    name = excluded.name,
    category = excluded.category;
end;
$$;

create or replace function public.cms_delete_skill(p_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.skills where id = p_id;
$$;

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
  -- Profile is a required singleton keyed by the stable slug 'owner'. Update the
  -- existing row (or insert the singleton if it does not yet exist) so the admin
  -- can both create and update the single profile record. The caller's RLS
  -- policy (owner all) authorizes the write. The caller-provided p_id is used
  -- only for a brand-new insert; when the row already exists we keep its real id
  -- so the translation rows link to the actual profile.
  insert into public.profile (id, slug, name, short_name, github_url, linkedin_url, resume_url, phone, email, updated_at)
  values (p_id, 'owner', p_name, p_short_name, p_github_url, p_linkedin_url, p_resume_url, p_phone, p_email, now())
  on conflict (slug) do update set
    name = excluded.name,
    short_name = excluded.short_name,
    github_url = excluded.github_url,
    linkedin_url = excluded.linkedin_url,
    resume_url = excluded.resume_url,
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now()
  returning id into v_profile_id;

  -- Resolve the real id (covers the conflict-update path where the row keeps its
  -- original id rather than the caller-provided p_id).
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
  insert into public.social_links (id, label, url, icon_key, "order")
  values (p_id, p_label, p_url, p_icon_key, p_order)
  on conflict (id) do update set
    label = excluded.label,
    url = excluded.url,
    icon_key = excluded.icon_key,
    "order" = excluded."order";
$$;

create or replace function public.cms_delete_social(p_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.social_links where id = p_id;
$$;

create or replace function public.cms_delete_profile(p_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.profile where id = p_id;
$$;

-- Execute is granted to authenticated so the admin (owner) can call them with
-- their JWT; RLS on the content tables then authorizes each operation. service_role
-- keeps its existing execute grant for the server-side backfill/seed path.
revoke all on function public.cms_upsert_skill(text, text, text, text, integer, boolean, text, text, text, text) from public;
revoke all on function public.cms_delete_skill(text) from public;
revoke all on function public.cms_upsert_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.cms_upsert_social(text, text, text, text, integer) from public;
revoke all on function public.cms_delete_social(text) from public;
revoke all on function public.cms_delete_profile(uuid) from public;

grant execute on function public.cms_upsert_skill(text, text, text, text, integer, boolean, text, text, text, text) to authenticated, service_role;
grant execute on function public.cms_delete_skill(text) to authenticated, service_role;
grant execute on function public.cms_upsert_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.cms_upsert_social(text, text, text, text, integer) to authenticated, service_role;
grant execute on function public.cms_delete_social(text) to authenticated, service_role;
grant execute on function public.cms_delete_profile(uuid) to authenticated, service_role;

-- Deterministic ordering is guaranteed by the queries in the admin data layer
-- (order by group_key/order/id and order/id); no schema change required.

-- Profile is a required singleton (unique slug, single owner). It can be created,
-- updated, and deleted by the admin; the public page falls back to local typed
-- content when the profile row is absent. The stable slug 'owner' is seeded so the
-- admin can create the record on first save.
insert into public.profile (slug, github_url)
  values ('owner', 'https://github.com/khoawatt')
  on conflict (slug) do nothing;