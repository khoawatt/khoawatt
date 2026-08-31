-- Add certificate links to resume entries (per-locale, JSONB).

alter table public.resume_entry_translations
  add column if not exists links jsonb not null default '[]';

-- Drop the previous 20-param signature before creating the 22-param version.
drop function if exists public.cms_upsert_resume_entry(text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb);

create or replace function public.cms_upsert_resume_entry(
  p_id text,
  p_category_id text,
  p_start_date text,
  p_end_date text,
  p_order integer,
  p_draft boolean,
  p_title_en text,
  p_title_vi text,
  p_organization_en text,
  p_organization_vi text,
  p_location_en text,
  p_location_vi text,
  p_date_label_en text,
  p_date_label_vi text,
  p_summary_en text,
  p_summary_vi text,
  p_highlights_en jsonb,
  p_highlights_vi jsonb,
  p_tags_en jsonb,
  p_tags_vi jsonb,
  p_links_en jsonb,
  p_links_vi jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.resume_entries (id, category_id, start_date, end_date, "order", draft, updated_at)
  values (p_id, p_category_id, p_start_date, p_end_date, p_order, p_draft, now())
  on conflict (id) do update set
    category_id = excluded.category_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    "order" = excluded."order",
    draft = excluded.draft,
    updated_at = now();

  insert into public.resume_entry_translations (resume_entry_id, locale, title, organization, location, date_label, summary, highlights, tags, links)
  values
    (p_id, 'en', p_title_en, p_organization_en, p_location_en, p_date_label_en, p_summary_en, p_highlights_en, p_tags_en, p_links_en),
    (p_id, 'vi', p_title_vi, p_organization_vi, p_location_vi, p_date_label_vi, p_summary_vi, p_highlights_vi, p_tags_vi, p_links_vi)
  on conflict (resume_entry_id, locale) do update set
    title = excluded.title,
    organization = excluded.organization,
    location = excluded.location,
    date_label = excluded.date_label,
    summary = excluded.summary,
    highlights = excluded.highlights,
    tags = excluded.tags,
    links = excluded.links;
end;
$$;

revoke all on function public.cms_upsert_resume_entry(text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.cms_upsert_resume_entry(text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;
