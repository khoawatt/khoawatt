-- Issue #89: Blog schema foundation.
--
-- Implements slice 1 of the blog design spec
-- (docs/superpowers/specs/2026-08-25-blog-design.md, §3 Data model).
--
-- Conventions followed from the established CMS migrations:
--   - Base rows use stable TEXT ids (projects/resume/skills/social pattern), not
--     UUIDs. Categories/tags use id = slug (like resume_categories); posts keep a
--     stable id independent of an editable slug (like projects), because a
--     published post's slug is a URL migration (§6) and must not change the id.
--   - `_translations` child tables keyed (entity_id, locale) with
--     locale CHECK in ('en','vi').
--   - SECURITY INVOKER atomic RPCs granted to authenticated + service_role, so
--     admin CRUD runs through the owner RLS path (same as cms_upsert_project /
--     cms_upsert_resume_entry). Each mutation writes base row + both translation
--     rows + tag links in one transaction.
--   - RLS: anon = zero privileges (hardening #66); authenticated owner is
--     authorized via private.is_owner(); service_role is the server read/write
--     path and bypasses RLS. The public repository adapter enforces
--     status='published' filtering (fail-closed, same philosophy as resume
--     publicity) — the anonymous read path is never exposed at the table level.
--   - Publish gate + update invariants live inside the atomic RPC, never
--     application-layer only.

-- --- Content tables -----------------------------------------------------------

create table blog_categories (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table blog_category_translations (
  category_id text not null references blog_categories(id) on delete cascade,
  locale text not null check (locale in ('en','vi')),
  name text not null check (btrim(name) <> ''),
  primary key (category_id, locale)
);

create table blog_tags (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table blog_tag_translations (
  tag_id text not null references blog_tags(id) on delete cascade,
  locale text not null check (locale in ('en','vi')),
  name text not null check (btrim(name) <> ''),
  primary key (tag_id, locale)
);

create table blog_posts (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id text not null references blog_categories(id) on delete restrict,
  cover_bucket_path text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table blog_post_translations (
  post_id text not null references blog_posts(id) on delete cascade,
  locale text not null check (locale in ('en','vi')),
  title text not null check (btrim(title) <> ''),
  summary text not null check (btrim(summary) <> ''),
  content_md text not null,
  primary key (post_id, locale)
);

create table blog_post_tags (
  post_id text not null references blog_posts(id) on delete cascade,
  tag_id text not null references blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- Supporting indexes for the high-frequency repository queries.
create index blog_posts_status_published_at_idx on blog_posts (status, published_at desc);
create index blog_posts_category_id_idx on blog_posts (category_id);
create index blog_post_tags_tag_id_idx on blog_post_tags (tag_id);

-- --- Grants -------------------------------------------------------------------
-- anon gets zero privileges (deny-by-default, hardening #66).

revoke all on blog_categories, blog_category_translations, blog_tags,
  blog_tag_translations, blog_posts, blog_post_translations, blog_post_tags
  from anon;

grant select, insert, update, delete on blog_categories, blog_category_translations,
  blog_tags, blog_tag_translations, blog_posts, blog_post_translations, blog_post_tags
  to authenticated, service_role;

-- --- RLS ----------------------------------------------------------------------

alter table blog_categories enable row level security;
alter table blog_category_translations enable row level security;
alter table blog_tags enable row level security;
alter table blog_tag_translations enable row level security;
alter table blog_posts enable row level security;
alter table blog_post_translations enable row level security;
alter table blog_post_tags enable row level security;

create policy "blog owner all" on blog_categories for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy "blog owner all" on blog_category_translations for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy "blog owner all" on blog_tags for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy "blog owner all" on blog_tag_translations for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy "blog owner all" on blog_posts for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy "blog owner all" on blog_post_translations for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy "blog owner all" on blog_post_tags for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- --- Atomic mutation RPCs (SECURITY INVOKER, owner RLS path) ------------------

-- Categories: stable slug id, sort order, EN/VI name.
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

  insert into public.blog_categories (id, slug, sort_order)
  values (p_id, p_id, p_sort_order)
  on conflict (id) do update set
    slug = excluded.slug,
    sort_order = excluded.sort_order;

  insert into public.blog_category_translations (category_id, locale, name)
  values
    (p_id, 'en', p_name_en),
    (p_id, 'vi', p_name_vi)
  on conflict (category_id, locale) do update set
    name = excluded.name;
end;
$$;

-- Category deletion is blocked while referenced by posts (DB restrict + friendly
-- RPC guard so the owner gets a clear, non-generic error).
create or replace function public.cms_delete_blog_category(p_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.blog_posts where category_id = p_id) then
    raise exception 'Category "%" cannot be deleted while posts reference it.', p_id;
  end if;
  delete from public.blog_categories where id = p_id;
end;
$$;

-- Tags: stable slug id, EN/VI name.
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

  insert into public.blog_tags (id, slug)
  values (p_id, p_id)
  on conflict (id) do update set
    slug = excluded.slug;

  insert into public.blog_tag_translations (tag_id, locale, name)
  values
    (p_id, 'en', p_name_en),
    (p_id, 'vi', p_name_vi)
  on conflict (tag_id, locale) do update set
    name = excluded.name;
end;
$$;

-- Tag deletion is blocked while referenced by posts (owner-operated CMS favors
-- explicit blocking over silent association cleanup, for auditability).
create or replace function public.cms_delete_blog_tag(p_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.blog_post_tags where tag_id = p_id) then
    raise exception 'Tag "%" cannot be deleted while posts reference it.', p_id;
  end if;
  delete from public.blog_tags where id = p_id;
end;
$$;

-- Posts: base row + both translations + tag links in one transaction, with the
-- publish gate and update invariants enforced atomically.
--
-- Publish gate: setting status='published' fails unless both en and vi
-- translations exist with non-empty title, summary, content_md, and a valid
-- category. The error enumerates exactly which locale/fields are missing so the
-- admin can surface them field-by-field.
--
-- Update invariants:
--   - status transitions are validated atomically (draft->published gated;
--     published->draft always allowed);
--   - a mutation that would empty a required translation of a published post is
--     rejected (the gate runs whenever the resulting status is 'published'), so
--     the owner must explicitly unpublish before stripping content;
--   - slug collisions and category/tag references are validated in the same
--     transaction.
--
-- published_at is stamped on the first successful publish and preserved on all
-- subsequent edits (including unpublish/republish cycles); it never moves.
create or replace function public.cms_upsert_blog_post(
  p_id text,
  p_slug text,
  p_category_id text,
  p_cover_bucket_path text,
  p_status text,
  p_tags text[],
  p_title_en text,
  p_summary_en text,
  p_content_md_en text,
  p_title_vi text,
  p_summary_vi text,
  p_content_md_vi text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_published_at timestamptz;
  v_missing text[] := '{}';
begin
  if p_status not in ('draft', 'published') then
    raise exception 'Invalid status "%". Must be draft or published.', p_status;
  end if;

  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid slug "%". Use lowercase letters, numbers, and hyphens.', p_slug;
  end if;

  -- Existing row context for the update invariants.
  select published_at into v_published_at
  from public.blog_posts
  where id = p_id;

  -- Slug uniqueness across posts (the column is unique; give a clear error).
  if exists (select 1 from public.blog_posts where slug = p_slug and id <> p_id) then
    raise exception 'Slug "%" is already in use by another post.', p_slug;
  end if;

  -- Publish gate: the resulting status is 'published', so every required
  -- translation field must be present and non-empty in both locales.
  if p_status = 'published' then
    if btrim(p_title_en) = '' then v_missing := array_append(v_missing, 'title (en)'); end if;
    if btrim(p_summary_en) = '' then v_missing := array_append(v_missing, 'summary (en)'); end if;
    if btrim(p_content_md_en) = '' then v_missing := array_append(v_missing, 'content (en)'); end if;
    if btrim(p_title_vi) = '' then v_missing := array_append(v_missing, 'title (vi)'); end if;
    if btrim(p_summary_vi) = '' then v_missing := array_append(v_missing, 'summary (vi)'); end if;
    if btrim(p_content_md_vi) = '' then v_missing := array_append(v_missing, 'content (vi)'); end if;
    if array_length(v_missing, 1) > 0 then
      raise exception 'Cannot publish: missing required translation(s): %', array_to_string(v_missing, ', ');
    end if;

    if not exists (select 1 from public.blog_categories where id = p_category_id) then
      raise exception 'Cannot publish: category "%" does not exist.', p_category_id;
    end if;

    -- First publish stamps published_at; subsequent edits never alter it.
    v_published_at := coalesce(v_published_at, now());
  end if;

  -- Base row upsert.
  insert into public.blog_posts (id, slug, category_id, cover_bucket_path, status, published_at, updated_at)
  values (p_id, p_slug, p_category_id, p_cover_bucket_path, p_status, v_published_at, now())
  on conflict (id) do update set
    slug = excluded.slug,
    category_id = excluded.category_id,
    cover_bucket_path = excluded.cover_bucket_path,
    status = excluded.status,
    published_at = excluded.published_at,
    updated_at = now();

  -- Translation upsert (title/summary non-empty CHECKs apply for drafts too).
  insert into public.blog_post_translations (post_id, locale, title, summary, content_md)
  values
    (p_id, 'en', p_title_en, p_summary_en, p_content_md_en),
    (p_id, 'vi', p_title_vi, p_summary_vi, p_content_md_vi)
  on conflict (post_id, locale) do update set
    title = excluded.title,
    summary = excluded.summary,
    content_md = excluded.content_md;

  -- Replace tag links atomically; every referenced tag must already exist.
  if p_tags is not null and array_length(p_tags, 1) > 0
     and exists (
       select 1 from unnest(p_tags) t
       where not exists (select 1 from public.blog_tags where id = t)
     ) then
    raise exception 'One or more tag ids do not exist.';
  end if;

  delete from public.blog_post_tags where post_id = p_id;
  if p_tags is not null and array_length(p_tags, 1) > 0 then
    insert into public.blog_post_tags (post_id, tag_id)
    select p_id, t from unnest(p_tags) t;
  end if;
end;
$$;

create or replace function public.cms_delete_blog_post(p_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.blog_posts where id = p_id;
$$;

revoke all on function public.cms_upsert_blog_category(text, integer, text, text) from public;
revoke all on function public.cms_delete_blog_category(text) from public;
revoke all on function public.cms_upsert_blog_tag(text, text, text) from public;
revoke all on function public.cms_delete_blog_tag(text) from public;
revoke all on function public.cms_upsert_blog_post(text, text, text, text, text, text[], text, text, text, text, text, text) from public;
revoke all on function public.cms_delete_blog_post(text) from public;

grant execute on function public.cms_upsert_blog_category(text, integer, text, text) to authenticated, service_role;
grant execute on function public.cms_delete_blog_category(text) to authenticated, service_role;
grant execute on function public.cms_upsert_blog_tag(text, text, text) to authenticated, service_role;
grant execute on function public.cms_delete_blog_tag(text) to authenticated, service_role;
grant execute on function public.cms_upsert_blog_post(text, text, text, text, text, text[], text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.cms_delete_blog_post(text) to authenticated, service_role;

-- --- blog-media Storage bucket -------------------------------------------------
-- Public bucket for post covers (same convention as project-media/portfolio:
-- public reads, owner-only writes via private.is_owner()).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "owner all blog-media objects" on storage.objects
  for all to authenticated
  using (bucket_id = 'blog-media' and private.is_owner())
  with check (bucket_id = 'blog-media' and private.is_owner());

create policy "public read blog-media" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'blog-media');

-- --- Seed ---------------------------------------------------------------------
-- 3 starter categories (Knowledge, Techniques, Reviews) + demo tag set.

insert into public.blog_categories (id, slug, sort_order) values
  ('knowledge', 'knowledge', 1),
  ('techniques', 'techniques', 2),
  ('reviews', 'reviews', 3)
on conflict (id) do nothing;

insert into public.blog_category_translations (category_id, locale, name) values
  ('knowledge', 'en', 'Knowledge'),
  ('knowledge', 'vi', 'Kiến thức'),
  ('techniques', 'en', 'Techniques'),
  ('techniques', 'vi', 'Kỹ thuật'),
  ('reviews', 'en', 'Reviews'),
  ('reviews', 'vi', 'Đánh giá')
on conflict (category_id, locale) do nothing;

insert into public.blog_tags (id, slug) values
  ('nextjs', 'nextjs'),
  ('supabase', 'supabase'),
  ('seo', 'seo'),
  ('typescript', 'typescript'),
  ('ai-agents', 'ai-agents'),
  ('ux', 'ux')
on conflict (id) do nothing;

insert into public.blog_tag_translations (tag_id, locale, name) values
  ('nextjs', 'en', 'Next.js'),
  ('nextjs', 'vi', 'Next.js'),
  ('supabase', 'en', 'Supabase'),
  ('supabase', 'vi', 'Supabase'),
  ('seo', 'en', 'SEO'),
  ('seo', 'vi', 'SEO'),
  ('typescript', 'en', 'TypeScript'),
  ('typescript', 'vi', 'TypeScript'),
  ('ai-agents', 'en', 'AI Agents'),
  ('ai-agents', 'vi', 'AI Agent'),
  ('ux', 'en', 'UX'),
  ('ux', 'vi', 'UX')
on conflict (tag_id, locale) do nothing;