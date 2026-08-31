-- Force hard delete — bypass retention guard for admin testing
-- Same as cms_hard_delete_entity but without private.is_hard_delete_eligible check
-- Still requires deleted_at IS NOT NULL (must be trashed) and dependency checks, and audit as hard_delete

create or replace function public.cms_force_hard_delete_entity(p_entity_type text, p_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_ALLOWED'); end if;
  if p_id = 'uncategorized' then return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_PROTECTED'); end if;

  if p_entity_type = 'skill' then
    select deleted_at into v_deleted from public.skills where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Not trashed or not found'); end if;
    delete from public.skills where id=p_id;
  elsif p_entity_type = 'social' then
    select deleted_at into v_deleted from public.social_links where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    delete from public.social_links where id=p_id;
  elsif p_entity_type = 'project' then
    select deleted_at into v_deleted from public.projects where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    delete from public.projects where id=p_id;
  elsif p_entity_type = 'resume_entry' then
    select deleted_at into v_deleted from public.resume_entries where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    delete from public.resume_entries where id=p_id;
  elsif p_entity_type = 'resume_category' then
    select deleted_at into v_deleted from public.resume_categories where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    if exists (select 1 from public.resume_entries where category_id=p_id and deleted_at is null) then
      return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS');
    end if;
    delete from public.resume_categories where id=p_id;
  elsif p_entity_type = 'blog_category' then
    select deleted_at into v_deleted from public.blog_categories where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    delete from public.blog_categories where id=p_id;
  elsif p_entity_type = 'blog_tag' then
    select deleted_at into v_deleted from public.blog_tags where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    if exists (select 1 from public.blog_post_tags where tag_id=p_id) then
      return jsonb_build_object('status','blocked','entity',p_entity_type,'id',p_id,'errorCode','DELETE_DEPENDENCY_EXISTS');
    end if;
    delete from public.blog_tags where id=p_id;
  elsif p_entity_type = 'blog_post' then
    select deleted_at into v_deleted from public.blog_posts where id=p_id for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    delete from public.blog_posts where id=p_id;
  elsif p_entity_type = 'profile' then
    select deleted_at into v_deleted from public.profile where id=p_id::uuid for update;
    if v_deleted is null then return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND'); end if;
    delete from public.profile where id=p_id::uuid;
  elsif p_entity_type = 'media_asset' then
    -- p_id is bucket:path? For force, expect p_id = path and need bucket param? Use separate function cms_force_hard_delete_media_asset instead
    return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Use cms_force_hard_delete_media_asset for media');
  else
    return jsonb_build_object('status','failed','entity',p_entity_type,'id',p_id,'errorCode','DELETE_NOT_FOUND','errorMessage','Unknown entity');
  end if;

  perform private.write_delete_audit(p_entity_type, p_id, p_id, 'hard_delete', 0, null, jsonb_build_object('force', true));
  return jsonb_build_object('status','deleted','entity',p_entity_type,'id',p_id,'operation','hard_delete','force', true);
end;
$$;
revoke all on function public.cms_force_hard_delete_entity(text,text) from public;
grant execute on function public.cms_force_hard_delete_entity(text,text) to authenticated;

-- Force for media_asset (needs bucket+path)
create or replace function public.cms_force_hard_delete_media_asset(p_bucket text, p_path text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  if not private.is_owner() then return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_ALLOWED'); end if;
  select deleted_at into v_deleted from public.media_assets where bucket=p_bucket and path=p_path for update;
  if v_deleted is null then return jsonb_build_object('status','failed','entity','media_asset','id',p_path,'errorCode','DELETE_NOT_FOUND'); end if;
  delete from public.media_assets where bucket=p_bucket and path=p_path;
  perform private.write_delete_audit('media_asset', p_path, p_path, 'hard_delete', 0, null, jsonb_build_object('bucket', p_bucket, 'force', true));
  -- Also try to remove from storage if still exists (best effort, enqueue if fails)
  -- Storage delete is done in app layer via service_role; here we just delete catalog row
  return jsonb_build_object('status','deleted','entity','media_asset','id',p_path,'force', true);
end;
$$;
revoke all on function public.cms_force_hard_delete_media_asset(text,text) from public;
grant execute on function public.cms_force_hard_delete_media_asset(text,text) to authenticated;
