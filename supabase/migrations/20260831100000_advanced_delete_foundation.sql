-- Phase 1-6 Advanced Delete Foundation (issue #117-#122)
-- Implements deleted_at soft delete, uncategorized, audit, storage queue, and all RPCs per docs/plans/advanced-delete-v2-trash.md v3

-- --- 1. deleted_at columns (all deletable tables incl. profile) -----------------
alter table profile add column if not exists deleted_at timestamptz;
alter table skills add column if not exists deleted_at timestamptz;
alter table social_links add column if not exists deleted_at timestamptz;
alter table projects add column if not exists deleted_at timestamptz;
alter table resume_categories add column if not exists deleted_at timestamptz;
alter table resume_entries add column if not exists deleted_at timestamptz;
alter table blog_categories add column if not exists deleted_at timestamptz;
alter table blog_tags add column if not exists deleted_at timestamptz;
alter table blog_posts add column if not exists deleted_at timestamptz;
alter table media_assets add column if not exists deleted_at timestamptz;

-- partial indexes for active rows
create index if not exists profile_active_idx on profile (id) where deleted_at is null;
create index if not exists skills_active_idx on skills (id) where deleted_at is null;
create index if not exists social_links_active_idx on social_links (id) where deleted_at is null;
create index if not exists projects_active_idx on projects (id) where deleted_at is null;
create index if not exists resume_categories_active_idx on resume_categories (id) where deleted_at is null;
create index if not exists resume_entries_active_idx on resume_entries (id) where deleted_at is null;
create index if not exists resume_entries_category_active_idx on resume_entries (category_id) where deleted_at is null;
create index if not exists blog_categories_active_idx on blog_categories (id) where deleted_at is null;
create index if not exists blog_tags_active_idx on blog_tags (id) where deleted_at is null;
create index if not exists blog_posts_active_idx on blog_posts (id) where deleted_at is null;
create index if not exists blog_posts_category_active_idx on blog_posts (category_id) where deleted_at is null;
create index if not exists media_assets_active_idx on media_assets (bucket, path) where deleted_at is null;
create index if not exists blog_posts_cover_idx on blog_posts (cover_bucket_path) where deleted_at is null;

-- --- 2. uncategorized category (protected) ------------------------------------
insert into blog_categories (id, slug, sort_order) values ('uncategorized','uncategorized', 999)
on conflict (id) do nothing;
insert into blog_category_translations (category_id, locale, name) values
  ('uncategorized','en','Uncategorized'),
  ('uncategorized','vi','Chưa phân loại')
on conflict (category_id, locale) do nothing;

-- --- 3. app_settings retention -------------------------------------------------
insert into app_settings (key, value) values ('delete.retention_days', '30')
on conflict (key) do nothing;

-- --- 4. admin_delete_audit ----------------------------------------------------
create table if not exists admin_delete_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type text not null check (actor_type in ('user','system')),
  entity_type text not null check (entity_type in ('profile','skill','social','project','resume_category','resume_entry','blog_category','blog_tag','blog_post','media_asset')),
  entity_id text not null,
  entity_label text,
  operation text not null check (operation in ('soft_delete','restore','hard_delete','reassign')),
  dependency_count integer not null default 0,
  resolution_type text check (resolution_type in ('set_null','remove_node','reassign_uncategorized')),
  snapshot jsonb,
  created_at timestamptz not null default now(),
  check ((actor_type='user' and actor_id is not null) or (actor_type='system' and actor_id is null))
);
alter table admin_delete_audit enable row level security;
drop policy if exists "audit owner all" on admin_delete_audit;
create policy "audit owner all" on admin_delete_audit for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
revoke all on admin_delete_audit from anon;
grant select, insert on admin_delete_audit to authenticated, service_role;
create index if not exists admin_delete_audit_created_idx on admin_delete_audit (created_at desc);
create index if not exists admin_delete_audit_entity_idx on admin_delete_audit (entity_type, entity_id);

-- --- 5. storage_cleanup_queue (Phase 4, not waiting for P6) -------------------
create table if not exists storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('resume-media','project-media','portfolio','blog-media')),
  path text not null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  next_retry_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','done','dead')),
  unique (bucket, path)
);
alter table storage_cleanup_queue enable row level security;
drop policy if exists "queue owner all" on storage_cleanup_queue;
create policy "queue owner all" on storage_cleanup_queue for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
revoke all on storage_cleanup_queue from anon;
grant select, insert, update, delete on storage_cleanup_queue to authenticated, service_role;
create index if not exists storage_cleanup_queue_pending_idx on storage_cleanup_queue (next_retry_at) where status='pending';

-- helper to get retention days
create or replace function private.delete_retention_days()
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::int from public.app_settings where key='delete.retention_days'), 30);
$$;
revoke all on function private.delete_retention_days() from public;
grant execute on function private.delete_retention_days() to authenticated, service_role;

-- helper to check if hard delete eligible
create or replace function private.is_hard_delete_eligible(p_deleted_at timestamptz)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select p_deleted_at is not null and p_deleted_at + (private.delete_retention_days() || ' days')::interval <= now();
$$;
revoke all on function private.is_hard_delete_eligible(timestamptz) from public;
grant execute on function private.is_hard_delete_eligible(timestamptz) to authenticated, service_role;

-- audit writer (SECURITY INVOKER, owner RLS will enforce; also used by cron via dedicated wrapper)
create or replace function private.write_delete_audit(
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_operation text,
  p_dependency_count integer,
  p_resolution_type text,
  p_snapshot jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.admin_delete_audit (actor_id, actor_type, entity_type, entity_id, entity_label, operation, dependency_count, resolution_type, snapshot)
  values (auth.uid(), 'user', p_entity_type, p_entity_id, p_entity_label, p_operation, coalesce(p_dependency_count,0), p_resolution_type, p_snapshot);
end;
$$;
revoke all on function private.write_delete_audit(text,text,text,text,integer,text,jsonb) from public;
grant execute on function private.write_delete_audit(text,text,text,text,integer,text,jsonb) to authenticated;

-- system audit writer for cron
create or replace function private.write_delete_audit_system(
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_operation text,
  p_dependency_count integer,
  p_resolution_type text,
  p_snapshot jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_delete_audit (actor_id, actor_type, entity_type, entity_id, entity_label, operation, dependency_count, resolution_type, snapshot)
  values (null, 'system', p_entity_type, p_entity_id, p_entity_label, p_operation, coalesce(p_dependency_count,0), p_resolution_type, p_snapshot);
$$;
revoke all on function private.write_delete_audit_system(text,text,text,text,integer,text,jsonb) from public;
grant execute on function private.write_delete_audit_system(text,text,text,text,integer,text,jsonb) to service_role;

-- --- 6. Guard: prevent create/restore child into trashed parent (resume) -------
-- This is enforced inside RPCs below; no FK change needed yet (CASCADE remains but soft delete path uses guards).

-- --- 7. RPCs: soft delete, restore, hard delete, inspect, bulk, resolve -------

-- Generic helper: ensure uncategorized protected
create or replace function public.cms_soft_delete_blog_category(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_label text;
  v_count integer;
begin
  if not private.is_owner() then
    return jsonb_build_object('status','failed','entity','blog_category','id',p_id,'errorCode','DELETE_NOT_ALLOWED','errorMessage','Not allowed');
  end if;
  if p_id = 'uncategorized' then
    return jsonb_build_object('status','blocked','entity','blog_category','id',p_id,'errorCode','DELETE_PROTECTED','errorMessage','Cannot delete default category');
  end if;

  select name into v_label from public.blog_category_translations where category_id=p_id and locale='en' limit 1;

  -- lock category and its posts FOR UPDATE to prevent TOCTOU
  perform 1 from public.blog_categories where id=p_id and deleted_at is null for update;
  if not found then
    -- check if already deleted
    if exists (select 1 from public.blog_categories where id=p_id and deleted_at is not null) then
      return jsonb_build_object('status','failed','entity','blog_category','id',p_id,'errorCode','DELETE_ALREADY_DELETED');
    end if;
    return jsonb_build_object('status','failed','entity','blog_category','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;

  -- reassign posts to uncategorized in same tx
  update public.blog_posts set category_id='uncategorized', updated_at=now() where category_id=p_id and deleted_at is null;
  get diagnostics v_count = row_count;

  update public.blog_categories set deleted_at=now() where id=p_id;

  perform private.write_delete_audit('blog_category', p_id, coalesce(v_label,p_id), 'soft_delete', v_count, 'reassign_uncategorized', jsonb_build_object('reassigned_posts', v_count));

  return jsonb_build_object('status','deleted','entity','blog_category','id',p_id,'reassigned', v_count);
end;
$$;
revoke all on function public.cms_soft_delete_blog_category(text) from public;
grant execute on function public.cms_soft_delete_blog_category(text) to authenticated;

-- soft delete skill
create or replace function public.cms_soft_delete_skill(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','skill','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select name into v_label from public.skill_translations where skill_id=p_id and locale='en' limit 1;
  perform 1 from public.skills where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.skills where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','skill','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','skill','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  update public.skills set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('skill', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','skill','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_skill(text) from public;
grant execute on function public.cms_soft_delete_skill(text) to authenticated;

-- soft delete social
create or replace function public.cms_soft_delete_social(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','social','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select label into v_label from public.social_links where id=p_id and deleted_at is null limit 1;
  perform 1 from public.social_links where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.social_links where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','social','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','social','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  update public.social_links set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('social', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','social','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_social(text) from public;
grant execute on function public.cms_soft_delete_social(text) to authenticated;

-- soft delete project
create or replace function public.cms_soft_delete_project(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','project','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select title into v_label from public.project_translations where project_id=p_id and locale='en' limit 1;
  perform 1 from public.projects where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.projects where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','project','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','project','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  update public.projects set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('project', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','project','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_project(text) from public;
grant execute on function public.cms_soft_delete_project(text) to authenticated;

-- soft delete resume entry
create or replace function public.cms_soft_delete_resume_entry(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','resume_entry','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select title into v_label from public.resume_entry_translations where resume_entry_id=p_id and locale='en' limit 1;
  perform 1 from public.resume_entries where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.resume_entries where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','resume_entry','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','resume_entry','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  update public.resume_entries set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('resume_entry', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','resume_entry','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_resume_entry(text) from public;
grant execute on function public.cms_soft_delete_resume_entry(text) to authenticated;

-- soft delete resume category (blocking if entries exist)
create or replace function public.cms_soft_delete_resume_category(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text; v_cnt integer;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','resume_category','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select name into v_label from public.resume_category_translations where resume_category_id=p_id and locale='en' limit 1;
  perform 1 from public.resume_categories where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.resume_categories where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','resume_category','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','resume_category','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  select count(*) into v_cnt from public.resume_entries where category_id=p_id and deleted_at is null;
  if v_cnt > 0 then
    return jsonb_build_object('status','blocked','entity','resume_category','id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS','dependencyCount', v_cnt, 'errorMessage', format('Category "%s" still has %s entries', p_id, v_cnt));
  end if;
  update public.resume_categories set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('resume_category', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','resume_category','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_resume_category(text) from public;
grant execute on function public.cms_soft_delete_resume_category(text) to authenticated;

-- soft delete blog tag (blocking if posts reference)
create or replace function public.cms_soft_delete_blog_tag(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text; v_cnt integer;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','blog_tag','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select name into v_label from public.blog_tag_translations where tag_id=p_id and locale='en' limit 1;
  perform 1 from public.blog_tags where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.blog_tags where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','blog_tag','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','blog_tag','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  select count(*) into v_cnt from public.blog_post_tags where tag_id=p_id;
  -- also check if any of those posts are not deleted (if post is already trashed, tag can be deleted? keep blocking for safety)
  if v_cnt > 0 then
    return jsonb_build_object('status','blocked','entity','blog_tag','id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS','dependencyCount', v_cnt);
  end if;
  update public.blog_tags set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('blog_tag', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','blog_tag','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_blog_tag(text) from public;
grant execute on function public.cms_soft_delete_blog_tag(text) to authenticated;

-- soft delete blog post
create or replace function public.cms_soft_delete_blog_post(p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_label text;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','blog_post','id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select title into v_label from public.blog_post_translations where post_id=p_id and locale='en' limit 1;
  perform 1 from public.blog_posts where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.blog_posts where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','blog_post','id',p_id,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','blog_post','id',p_id,'errorCode','DELETE_NOT_FOUND');
  end if;
  update public.blog_posts set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('blog_post', p_id, coalesce(v_label,p_id), 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','blog_post','id',p_id);
end;
$$;
revoke all on function public.cms_soft_delete_blog_post(text) from public;
grant execute on function public.cms_soft_delete_blog_post(text) to authenticated;

-- soft delete media_asset
create or replace function public.cms_soft_delete_media_asset(p_bucket text, p_path text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_refs integer;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_ALLOWED'); end if;
  perform 1 from public.media_assets where bucket=p_bucket and path=p_path and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.media_assets where bucket=p_bucket and path=p_path and deleted_at is not null) then return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_FOUND');
  end if;
  -- reference check (exact for blog cover, ilike for others as candidate)
  -- count refs
  select (
    (select count(*) from public.project_media where src ilike '%' || p_path || '%' and project_id in (select id from public.projects where deleted_at is null))
    + (select count(*) from public.resume_media where (thumbnail_src ilike '%' || p_path || '%' or full_src ilike '%' || p_path || '%') and resume_entry_id in (select id from public.resume_entries where deleted_at is null))
    + (select count(*) from public.blog_posts where cover_bucket_path = p_path and deleted_at is null)
    + (select count(*) from public.blog_post_translations where content_md ilike '%' || p_path || '%' and post_id in (select id from public.blog_posts where deleted_at is null))
  ) into v_refs;
  if v_refs > 0 then
    return jsonb_build_object('status','blocked','entity','media_asset','id',p_path,'errorCode','DELETE_DEPENDENCY_EXISTS','dependencyCount', v_refs);
  end if;
  update public.media_assets set deleted_at=now() where bucket=p_bucket and path=p_path;
  perform private.write_delete_audit('media_asset', p_path, p_path, 'soft_delete', 0, null, jsonb_build_object('bucket', p_bucket));
  return jsonb_build_object('status','deleted','entity','media_asset','id',p_path);
end;
$$;
revoke all on function public.cms_soft_delete_media_asset(text,text) from public;
grant execute on function public.cms_soft_delete_media_asset(text,text) to authenticated;

-- soft delete profile (singleton)
create or replace function public.cms_soft_delete_profile(p_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','profile','id',p_id::text,'errorCode','DELETE_NOT_ALLOWED'); end if;
  perform 1 from public.profile where id=p_id and deleted_at is null for update;
  if not found then
    if exists (select 1 from public.profile where id=p_id and deleted_at is not null) then return jsonb_build_object('status','failed','entity','profile','id',p_id::text,'errorCode','DELETE_ALREADY_DELETED'); end if;
    return jsonb_build_object('status','failed','entity','profile','id',p_id::text,'errorCode','DELETE_NOT_FOUND');
  end if;
  update public.profile set deleted_at=now() where id=p_id;
  perform private.write_delete_audit('profile', p_id::text, 'profile', 'soft_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity','profile','id',p_id::text);
end;
$$;
revoke all on function public.cms_soft_delete_profile(uuid) from public;
grant execute on function public.cms_soft_delete_profile(uuid) to authenticated;

-- restore
create or replace function public.cms_restore_entity(p_entity_type text, p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;

  if p_entity_type = 'skill' then
    select deleted_at into v_deleted from public.skills where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.skills set deleted_at=null where id=p_id;
  elsif p_entity_type = 'social' then
    select deleted_at into v_deleted from public.social_links where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.social_links set deleted_at=null where id=p_id;
  elsif p_entity_type = 'project' then
    select deleted_at into v_deleted from public.projects where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.projects set deleted_at=null where id=p_id;
  elsif p_entity_type = 'resume_category' then
    select deleted_at into v_deleted from public.resume_categories where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.resume_categories set deleted_at=null where id=p_id;
  elsif p_entity_type = 'resume_entry' then
    -- check parent not trashed
    if exists (select 1 from public.resume_entries e join public.resume_categories c on c.id=e.category_id where e.id=p_id and c.deleted_at is not null) then
      return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS','errorMessage','Parent category is trashed');
    end if;
    select deleted_at into v_deleted from public.resume_entries where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.resume_entries set deleted_at=null where id=p_id;
  elsif p_entity_type = 'blog_category' then
    select deleted_at into v_deleted from public.blog_categories where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.blog_categories set deleted_at=null where id=p_id;
  elsif p_entity_type = 'blog_tag' then
    select deleted_at into v_deleted from public.blog_tags where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.blog_tags set deleted_at=null where id=p_id;
  elsif p_entity_type = 'blog_post' then
    -- check category not trashed
    if exists (select 1 from public.blog_posts p join public.blog_categories c on c.id=p.category_id where p.id=p_id and c.deleted_at is not null) then
      return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS','errorMessage','Category is trashed');
    end if;
    select deleted_at into v_deleted from public.blog_posts where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.blog_posts set deleted_at=null where id=p_id;
  elsif p_entity_type = 'media_asset' then
    -- p_id is path, need bucket in snapshot? For generic restore, expect p_id = bucket:path
    return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Use bucket+path restore');
  elsif p_entity_type = 'profile' then
    select deleted_at into v_deleted from public.profile where id=p_id::uuid for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    update public.profile set deleted_at=null where id=p_id::uuid;
  else
    return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Unknown entity');
  end if;

  perform private.write_delete_audit(p_entity_type, p_id, p_id, 'restore', 0, null, null);
  return jsonb_build_object('status','deleted','entity',p_entity_type,'id',p_id,'operation','restore');
end;
$$;
revoke all on function public.cms_restore_entity(text,text) from public;
grant execute on function public.cms_restore_entity(text,text) to authenticated;

-- restore media_asset with bucket+path
create or replace function public.cms_restore_media_asset(p_bucket text, p_path text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select deleted_at into v_deleted from public.media_assets where bucket=p_bucket and path=p_path for update;
  if v_deleted is null then
    if not exists (select 1 from public.media_assets where bucket=p_bucket and path=p_path) then
      return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_FOUND');
    end if;
    return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_FOUND','errorMessage','Not trashed');
  end if;
  update public.media_assets set deleted_at=null where bucket=p_bucket and path=p_path;
  perform private.write_delete_audit('media_asset', p_path, p_path, 'restore', 0, null, jsonb_build_object('bucket',p_bucket));
  return jsonb_build_object('status','deleted','entity','media_asset','id',p_path,'operation','restore');
end;
$$;
revoke all on function public.cms_restore_media_asset(text,text) from public;
grant execute on function public.cms_restore_media_asset(text,text) to authenticated;

-- hard delete (only when eligible)
create or replace function public.cms_hard_delete_entity(p_entity_type text, p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_deleted timestamptz; v_eligible boolean;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  if p_id = 'uncategorized' then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_PROTECTED'); end if;

  if p_entity_type = 'skill' then
    select deleted_at into v_deleted from public.skills where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Not trashed or not found'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.skills where id=p_id;
  elsif p_entity_type = 'social' then
    select deleted_at into v_deleted from public.social_links where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.social_links where id=p_id;
  elsif p_entity_type = 'project' then
    select deleted_at into v_deleted from public.projects where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.projects where id=p_id;
  elsif p_entity_type = 'resume_entry' then
    select deleted_at into v_deleted from public.resume_entries where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.resume_entries where id=p_id;
  elsif p_entity_type = 'resume_category' then
    select deleted_at into v_deleted from public.resume_categories where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    -- re-check no active entries
    if exists (select 1 from public.resume_entries where category_id=p_id and deleted_at is null) then
      return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS');
    end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.resume_categories where id=p_id;
  elsif p_entity_type = 'blog_category' then
    select deleted_at into v_deleted from public.blog_categories where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.blog_categories where id=p_id;
  elsif p_entity_type = 'blog_tag' then
    select deleted_at into v_deleted from public.blog_tags where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    if exists (select 1 from public.blog_post_tags where tag_id=p_id) then
      return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS');
    end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.blog_tags where id=p_id;
  elsif p_entity_type = 'blog_post' then
    select deleted_at into v_deleted from public.blog_posts where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.blog_posts where id=p_id;
  elsif p_entity_type = 'profile' then
    select deleted_at into v_deleted from public.profile where id=p_id::uuid for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    select private.is_hard_delete_eligible(v_deleted) into v_eligible;
    if not v_eligible then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_YET_ELIGIBLE'); end if;
    delete from public.profile where id=p_id::uuid;
  else
    return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Unknown entity');
  end if;

  perform private.write_delete_audit(p_entity_type, p_id, p_id, 'hard_delete', 0, null, null);
  return jsonb_build_object('status','deleted','entity',p_entity_type,'id',p_id,'operation','hard_delete');
end;
$$;
revoke all on function public.cms_hard_delete_entity(text,text) from public;
grant execute on function public.cms_hard_delete_entity(text,text) to authenticated;

-- legacy aliases delegate to soft delete (invariant: no hard delete of active row)
drop function if exists public.cms_delete_skill(text);
create function public.cms_delete_skill(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_skill(p_id); $$;
revoke all on function public.cms_delete_skill(text) from public;
grant execute on function public.cms_delete_skill(text) to authenticated;

drop function if exists public.cms_delete_social(text);
create function public.cms_delete_social(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_social(p_id); $$;
revoke all on function public.cms_delete_social(text) from public;
grant execute on function public.cms_delete_social(text) to authenticated;

drop function if exists public.cms_delete_profile(uuid);
create function public.cms_delete_profile(p_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_profile(p_id); $$;
revoke all on function public.cms_delete_profile(uuid) from public;
grant execute on function public.cms_delete_profile(uuid) to authenticated;

drop function if exists public.cms_delete_project(text);
create function public.cms_delete_project(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_project(p_id); $$;
revoke all on function public.cms_delete_project(text) from public;
grant execute on function public.cms_delete_project(text) to authenticated;

drop function if exists public.cms_delete_resume_category(text);
create function public.cms_delete_resume_category(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_resume_category(p_id); $$;
revoke all on function public.cms_delete_resume_category(text) from public;
grant execute on function public.cms_delete_resume_category(text) to authenticated;

drop function if exists public.cms_delete_resume_entry(text);
create function public.cms_delete_resume_entry(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_resume_entry(p_id); $$;
revoke all on function public.cms_delete_resume_entry(text) from public;
grant execute on function public.cms_delete_resume_entry(text) to authenticated;

drop function if exists public.cms_delete_blog_category(text);
create function public.cms_delete_blog_category(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_blog_category(p_id); $$;
revoke all on function public.cms_delete_blog_category(text) from public;
grant execute on function public.cms_delete_blog_category(text) to authenticated;

drop function if exists public.cms_delete_blog_tag(text);
create function public.cms_delete_blog_tag(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_blog_tag(p_id); $$;
revoke all on function public.cms_delete_blog_tag(text) from public;
grant execute on function public.cms_delete_blog_tag(text) to authenticated;

drop function if exists public.cms_delete_blog_post(text);
create function public.cms_delete_blog_post(p_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select public.cms_soft_delete_blog_post(p_id); $$;
revoke all on function public.cms_delete_blog_post(text) from public;
grant execute on function public.cms_delete_blog_post(text) to authenticated;

-- inspect (dry-run)
create or replace function public.cms_inspect_delete(p_entity_type text, p_ids text[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id text;
  v_deletable text[] := '{}';
  v_blocked text[] := '{}';
  v_deps jsonb := '[]'::jsonb;
  v_cnt integer;
begin
  if not private.is_owner() then
    return jsonb_build_object('error','Not allowed');
  end if;

  foreach v_id in array p_ids loop
    if p_entity_type = 'blog_category' then
      if v_id = 'uncategorized' then
        v_blocked := array_append(v_blocked, v_id);
        v_deps := v_deps || jsonb_build_object('entity','blog_category','id',v_id,'field','protected','count',1,'type','blocking-reference');
      elsif not exists (select 1 from public.blog_categories where id=v_id and deleted_at is null) then
        v_blocked := array_append(v_blocked, v_id);
      else
        v_deletable := array_append(v_deletable, v_id);
        select count(*) into v_cnt from public.blog_posts where category_id=v_id and deleted_at is null;
        if v_cnt > 0 then
          v_deps := v_deps || jsonb_build_object('entity','blog_category','id',v_id,'field','reassign_uncategorized','count',v_cnt,'type','reassign');
        end if;
      end if;
    elsif p_entity_type = 'blog_tag' then
      if not exists (select 1 from public.blog_tags where id=v_id and deleted_at is null) then
        v_blocked := array_append(v_blocked, v_id);
      else
        select count(*) into v_cnt from public.blog_post_tags where tag_id=v_id;
        if v_cnt > 0 then
          v_blocked := array_append(v_blocked, v_id);
          v_deps := v_deps || jsonb_build_object('entity','blog_tag','id',v_id,'field','blog_post_tags','count',v_cnt,'type','blocking-reference');
        else
          v_deletable := array_append(v_deletable, v_id);
        end if;
      end if;
    elsif p_entity_type = 'resume_category' then
      if not exists (select 1 from public.resume_categories where id=v_id and deleted_at is null) then
        v_blocked := array_append(v_blocked, v_id);
      else
        select count(*) into v_cnt from public.resume_entries where category_id=v_id and deleted_at is null;
        if v_cnt > 0 then
          v_blocked := array_append(v_blocked, v_id);
          v_deps := v_deps || jsonb_build_object('entity','resume_category','id',v_id,'field','resume_entries','count',v_cnt,'type','blocking-reference');
        else
          v_deletable := array_append(v_deletable, v_id);
        end if;
      end if;
    elsif p_entity_type = 'media_asset' then
      -- p_id is path, but for bulk we treat v_id as path; bucket needed - inspect not ideal for media without bucket, so mark deletable if not referenced
      -- For simplicity, if media_asset, check all buckets for path
      select (
        (select count(*) from public.project_media where src ilike '%' || v_id || '%')
        + (select count(*) from public.blog_posts where cover_bucket_path = v_id and deleted_at is null)
        + (select count(*) from public.blog_post_translations where content_md ilike '%' || v_id || '%' )
      ) into v_cnt;
      if v_cnt > 0 then
        v_blocked := array_append(v_blocked, v_id);
        v_deps := v_deps || jsonb_build_object('entity','media_asset','id',v_id,'field','reference','count',v_cnt,'type','blocking-reference');
      else
        v_deletable := array_append(v_deletable, v_id);
      end if;
    else
      -- generic: if exists and not deleted, deletable
      if p_entity_type = 'skill' and exists (select 1 from public.skills where id=v_id and deleted_at is null) then
        v_deletable := array_append(v_deletable, v_id);
      elsif p_entity_type = 'social' and exists (select 1 from public.social_links where id=v_id and deleted_at is null) then
        v_deletable := array_append(v_deletable, v_id);
      elsif p_entity_type = 'project' and exists (select 1 from public.projects where id=v_id and deleted_at is null) then
        v_deletable := array_append(v_deletable, v_id);
      elsif p_entity_type = 'resume_entry' and exists (select 1 from public.resume_entries where id=v_id and deleted_at is null) then
        v_deletable := array_append(v_deletable, v_id);
      elsif p_entity_type = 'blog_post' and exists (select 1 from public.blog_posts where id=v_id and deleted_at is null) then
        v_deletable := array_append(v_deletable, v_id);
      elsif p_entity_type = 'profile' and exists (select 1 from public.profile where id=v_id::uuid and deleted_at is null) then
        v_deletable := array_append(v_deletable, v_id);
      else
        v_blocked := array_append(v_blocked, v_id);
      end if;
    end if;
  end loop;

  return jsonb_build_object('deletable', to_jsonb(v_deletable), 'blocked', to_jsonb(v_blocked), 'dependencies', v_deps);
end;
$$;
revoke all on function public.cms_inspect_delete(text,text[]) from public;
grant execute on function public.cms_inspect_delete(text,text[]) to authenticated;

-- bulk soft delete (subtransaction per id)
create or replace function public.cms_bulk_soft_delete(p_entity_type text, p_ids text[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id text;
  v_res jsonb;
  v_deleted text[] := '{}';
  v_blocked text[] := '{}';
  v_failed text[] := '{}';
begin
  if not private.is_owner() then
    return jsonb_build_object('requested', array_length(p_ids,1), 'deleted', v_deleted, 'blocked', v_blocked, 'failed', v_failed, 'error','Not allowed');
  end if;

  foreach v_id in array p_ids loop
    begin
      if p_entity_type = 'skill' then v_res := public.cms_soft_delete_skill(v_id);
      elsif p_entity_type = 'social' then v_res := public.cms_soft_delete_social(v_id);
      elsif p_entity_type = 'project' then v_res := public.cms_soft_delete_project(v_id);
      elsif p_entity_type = 'resume_entry' then v_res := public.cms_soft_delete_resume_entry(v_id);
      elsif p_entity_type = 'resume_category' then v_res := public.cms_soft_delete_resume_category(v_id);
      elsif p_entity_type = 'blog_category' then v_res := public.cms_soft_delete_blog_category(v_id);
      elsif p_entity_type = 'blog_tag' then v_res := public.cms_soft_delete_blog_tag(v_id);
      elsif p_entity_type = 'blog_post' then v_res := public.cms_soft_delete_blog_post(v_id);
      elsif p_entity_type = 'profile' then v_res := public.cms_soft_delete_profile(v_id::uuid);
      else v_res := jsonb_build_object('status','failed');
      end if;

      if v_res->>'status' = 'deleted' then
        v_deleted := array_append(v_deleted, v_id);
      elsif v_res->>'status' = 'blocked' then
        v_blocked := array_append(v_blocked, v_id);
      else
        v_failed := array_append(v_failed, v_id);
      end if;
    exception when others then
      v_failed := array_append(v_failed, v_id);
    end;
  end loop;

  return jsonb_build_object('requested', coalesce(array_length(p_ids,1),0), 'deleted', to_jsonb(v_deleted), 'blocked', to_jsonb(v_blocked), 'failed', to_jsonb(v_failed));
end;
$$;
revoke all on function public.cms_bulk_soft_delete(text,text[]) from public;
grant execute on function public.cms_bulk_soft_delete(text,text[]) to authenticated;

-- resolve media: SET NULL cover, remove node from content_md (parser in app layer will do precise, here simplified)
-- This function is called from app layer after precise parsing; it just does the DB update with FOR UPDATE + version check
create or replace function public.cms_resolve_media_reference(p_bucket text, p_path text, p_resolve_type text, p_expected_updated_at timestamptz default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_cnt integer;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','errorCode','DELETE_NOT_ALLOWED'); end if;

  if p_resolve_type = 'set_null' then
    -- cover
    update public.blog_posts set cover_bucket_path=null, updated_at=now()
    where cover_bucket_path=p_path and deleted_at is null
    and (p_expected_updated_at is null or updated_at = p_expected_updated_at);
    get diagnostics v_cnt = row_count;
    perform private.write_delete_audit('media_asset', p_path, p_path, 'reassign', v_cnt, 'set_null', jsonb_build_object('bucket',p_bucket));
    return jsonb_build_object('status','deleted','cleared', v_cnt);
  elsif p_resolve_type = 'remove_node' then
    -- For remove_node, the app layer should have already computed the new content_md and will call cms_update_post_content or similar.
    -- Here we just acknowledge; real mutation is via cms_upsert_blog_post with new content.
    return jsonb_build_object('status','blocked','errorMessage','Use cms_upsert_blog_post with cleaned content');
  else
    return jsonb_build_object('status','failed','errorMessage','Unknown resolve type');
  end if;
end;
$$;
revoke all on function public.cms_resolve_media_reference(text,text,text,timestamptz) from public;
grant execute on function public.cms_resolve_media_reference(text,text,text,timestamptz) to authenticated;

-- cron hard delete expired (dedicated service_role function)
create or replace function public.cron_hard_delete_expired()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_total integer := 0;
begin
  -- skills
  for r in select id, deleted_at from public.skills where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.skills where id=r.id;
    perform private.write_delete_audit_system('skill', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  -- projects
  for r in select id, deleted_at from public.projects where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.projects where id=r.id;
    perform private.write_delete_audit_system('project', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  -- blog_posts
  for r in select id, deleted_at from public.blog_posts where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.blog_posts where id=r.id;
    perform private.write_delete_audit_system('blog_post', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  -- blog_categories (exclude uncategorized)
  for r in select id, deleted_at from public.blog_categories where id != 'uncategorized' and deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    -- re-check no active entries (should not happen as soft delete blocked, but for safety)
    if not exists (select 1 from public.resume_entries where category_id=r.id and deleted_at is null) then
      delete from public.blog_categories where id=r.id;
      perform private.write_delete_audit_system('blog_category', r.id, r.id, 'hard_delete', 0, null, null);
      v_total := v_total + 1;
    end if;
  end loop;
  -- add other entities similarly
  for r in select id, deleted_at from public.blog_tags where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    if not exists (select 1 from public.blog_post_tags where tag_id=r.id) then
      delete from public.blog_tags where id=r.id;
      perform private.write_delete_audit_system('blog_tag', r.id, r.id, 'hard_delete', 0, null, null);
      v_total := v_total + 1;
    end if;
  end loop;
  for r in select id, deleted_at from public.resume_entries where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.resume_entries where id=r.id;
    perform private.write_delete_audit_system('resume_entry', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  for r in select id, deleted_at from public.resume_categories where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    if not exists (select 1 from public.resume_entries where category_id=r.id and deleted_at is null) then
      delete from public.resume_categories where id=r.id;
      perform private.write_delete_audit_system('resume_category', r.id, r.id, 'hard_delete', 0, null, null);
      v_total := v_total + 1;
    end if;
  end loop;
  for r in select id, deleted_at from public.social_links where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.social_links where id=r.id;
    perform private.write_delete_audit_system('social', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  for r in select bucket, path from public.media_assets where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.media_assets where bucket=r.bucket and path=r.path;
    perform private.write_delete_audit_system('media_asset', r.path, r.path, 'hard_delete', 0, null, jsonb_build_object('bucket', r.bucket));
    v_total := v_total + 1;
  end loop;

  return jsonb_build_object('hard_deleted', v_total);
end;
$$;
revoke all on function public.cron_hard_delete_expired() from public;
grant execute on function public.cron_hard_delete_expired() to service_role;

-- storage retry (dedicated service_role)
create or replace function public.cron_retry_storage_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare r record; v_processed integer :=0;
begin
  for r in select id, bucket, path, attempts from public.storage_cleanup_queue where status='pending' and next_retry_at <= now() order by next_retry_at for update skip locked limit 10 loop
    -- In real cron, would attempt storage.objects delete via service_role client; here we just simulate backoff
    -- For now, mark as pending with next_retry_at backoff, or dead after 5
    if r.attempts >= 5 then
      update public.storage_cleanup_queue set status='dead', last_error='max attempts' where id=r.id;
    else
      update public.storage_cleanup_queue set attempts=r.attempts+1, next_retry_at=now() + ( (2 ^ r.attempts) || ' minutes')::interval where id=r.id;
    end if;
    v_processed := v_processed+1;
  end loop;
  return jsonb_build_object('processed', v_processed);
end;
$$;
revoke all on function public.cron_retry_storage_cleanup() from public;
grant execute on function public.cron_retry_storage_cleanup() to service_role;

-- --- 8. Harden existing upsert to block trashed parent -----------------------
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
  p_tags_vi jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- block if category is trashed
  if exists (select 1 from public.resume_categories where id=p_category_id and deleted_at is not null) then
    raise exception 'Cannot create entry in trashed category "%"', p_category_id;
  end if;

  insert into public.resume_entries (id, category_id, start_date, end_date, "order", draft, updated_at)
  values (p_id, p_category_id, p_start_date, p_end_date, p_order, p_draft, now())
  on conflict (id) do update set
    category_id = excluded.category_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    "order" = excluded."order",
    draft = excluded.draft,
    updated_at = now();

  insert into public.resume_entry_translations (resume_entry_id, locale, title, organization, location, date_label, summary, highlights, tags)
  values
    (p_id, 'en', p_title_en, p_organization_en, p_location_en, p_date_label_en, p_summary_en, p_highlights_en, p_tags_en),
    (p_id, 'vi', p_title_vi, p_organization_vi, p_location_vi, p_date_label_vi, p_summary_vi, p_highlights_vi, p_tags_vi)
  on conflict (resume_entry_id, locale) do update set
    title = excluded.title,
    organization = excluded.organization,
    location = excluded.location,
    date_label = excluded.date_label,
    summary = excluded.summary,
    highlights = excluded.highlights,
    tags = excluded.tags;
end;
$$;
-- keep grants (signature may have evolved, use dynamic)
do $$ begin
  execute 'revoke all on function public.cms_upsert_resume_entry(text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,jsonb) from public';
exception when undefined_function then null;
end $$;
do $$ begin
  execute 'grant execute on function public.cms_upsert_resume_entry(text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,jsonb) to authenticated, service_role';
exception when undefined_function then null;
end $$;
-- also try with links signature (if exists on dev — 22 args: +2 jsonb)
do $$ begin
  execute 'revoke all on function public.cms_upsert_resume_entry(text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public';
exception when undefined_function then null;
end $$;
do $$ begin
  execute 'grant execute on function public.cms_upsert_resume_entry(text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated, service_role';
exception when undefined_function then null;
end $$;

-- similar guard for blog post category
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

  -- block if category is trashed
  if exists (select 1 from public.blog_categories where id=p_category_id and deleted_at is not null) then
    raise exception 'Cannot use trashed category "%"', p_category_id;
  end if;

  select published_at into v_published_at
  from public.blog_posts
  where id = p_id;

  if exists (select 1 from public.blog_posts where slug = p_slug and id <> p_id) then
    raise exception 'Slug "%" is already in use by another post.', p_slug;
  end if;

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

    if not exists (select 1 from public.blog_categories where id = p_category_id and deleted_at is null) then
      raise exception 'Cannot publish: category "%" does not exist.', p_category_id;
    end if;

    v_published_at := coalesce(v_published_at, now());
  end if;

  insert into public.blog_posts (id, slug, category_id, cover_bucket_path, status, published_at, updated_at)
  values (p_id, p_slug, p_category_id, p_cover_bucket_path, p_status, v_published_at, now())
  on conflict (id) do update set
    slug = excluded.slug,
    category_id = excluded.category_id,
    cover_bucket_path = excluded.cover_bucket_path,
    status = excluded.status,
    published_at = excluded.published_at,
    updated_at = now();

  insert into public.blog_post_translations (post_id, locale, title, summary, content_md)
  values
    (p_id, 'en', p_title_en, p_summary_en, p_content_md_en),
    (p_id, 'vi', p_title_vi, p_summary_vi, p_content_md_vi)
  on conflict (post_id, locale) do update set
    title = excluded.title,
    summary = excluded.summary,
    content_md = excluded.content_md;

  if p_tags is not null and array_length(p_tags, 1) > 0
     and exists (
       select 1 from unnest(p_tags) t
       where not exists (select 1 from public.blog_tags where id = t and deleted_at is null)
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
revoke all on function public.cms_upsert_blog_post(text,text,text,text,text,text[],text,text,text,text,text,text) from public;
grant execute on function public.cms_upsert_blog_post(text,text,text,text,text,text[],text,text,text,text,text,text) to authenticated, service_role;
