-- Issue #82 follow-up to #81: admin edits must be able to CLEAR a skill's
-- category key (moving a skill out of a group). The #81 version used
-- coalesce-on-update so legacy callers omitting p_category_key kept the old
-- value; now the only writer (admin upsert) passes the parameter explicitly,
-- so plain assignment is correct and clearing works.
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
  p_category_vi text,
  p_category_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.skills (id, group_key, icon_key, url, "order", featured, category_key)
  values (p_id, p_group_key, p_icon_key, p_url, p_order, p_featured, p_category_key)
  on conflict (id) do update set
    group_key = excluded.group_key,
    icon_key = excluded.icon_key,
    url = excluded.url,
    "order" = excluded."order",
    featured = excluded.featured,
    category_key = excluded.category_key;

  insert into public.skill_translations (skill_id, locale, name, category)
  values
    (p_id, 'en', p_name_en, p_category_en),
    (p_id, 'vi', p_name_vi, p_category_vi)
  on conflict (skill_id, locale) do update set
    name = excluded.name,
    category = excluded.category;
end;
$$;
