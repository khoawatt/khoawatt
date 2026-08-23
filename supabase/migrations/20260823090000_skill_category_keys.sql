-- Issue #81: stable skill taxonomy keys.
--
-- The 7 public "Others" groups (plus the 3 Agentic AI sub-sections) were only
-- encoded as free-text `skill_translations.category` strings matched by exact
-- English title. Structural group membership is not locale data, so it moves to
-- a stable key on the base row; display labels stay code-owned
-- (src/content/skills.ts otherTaxonomy). The legacy category strings remain as
-- a temporary compatibility path for rows that are not backfilled.

alter table public.skills add column if not exists category_key text;

-- Backfill from the English translation's category title using the same
-- mapping the read path used before keys existed.
update public.skills s
set category_key = case t.category
  when 'Architecture' then 'architecture'
  when 'DevOps & Infrastructure' then 'devops-infrastructure'
  when 'Frontend & UX' then 'frontend-ux'
  when 'SEO & Growth' then 'seo-growth'
  when 'Workflow & Collaboration' then 'workflow-collaboration'
  when 'Product & Creative' then 'product-creative'
  when 'AI Models & Assistants' then 'ai-models-assistants'
  when 'Agentic Coding & Harness' then 'agentic-coding-harness'
  when 'AI Development Capabilities' then 'ai-development-capabilities'
  else null
end
from public.skill_translations t
where t.skill_id = s.id
  and t.locale = 'en'
  and s.group_key = 'others';

-- Atomic mutation RPC: accept and persist the stable key (optional param keeps
-- existing callers working until the admin UI passes it explicitly).
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
    category_key = coalesce(excluded.category_key, public.skills.category_key);

  insert into public.skill_translations (skill_id, locale, name, category)
  values
    (p_id, 'en', p_name_en, p_category_en),
    (p_id, 'vi', p_name_vi, p_category_vi)
  on conflict (skill_id, locale) do update set
    name = excluded.name,
    category = excluded.category;
end;
$$;
