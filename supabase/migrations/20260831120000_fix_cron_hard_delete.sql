-- Fix cron_hard_delete_expired: blog_categories check was wrong (checked resume_entries), should check blog_posts

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
  -- blog_categories (exclude uncategorized, check no active posts)
  for r in select id, deleted_at from public.blog_categories where id != 'uncategorized' and deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    if not exists (select 1 from public.blog_posts where category_id=r.id and deleted_at is null) then
      delete from public.blog_categories where id=r.id;
      perform private.write_delete_audit_system('blog_category', r.id, r.id, 'hard_delete', 0, null, null);
      v_total := v_total + 1;
    end if;
  end loop;
  -- blog_tags
  for r in select id, deleted_at from public.blog_tags where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    if not exists (select 1 from public.blog_post_tags where tag_id=r.id) then
      delete from public.blog_tags where id=r.id;
      perform private.write_delete_audit_system('blog_tag', r.id, r.id, 'hard_delete', 0, null, null);
      v_total := v_total + 1;
    end if;
  end loop;
  -- resume_entries
  for r in select id, deleted_at from public.resume_entries where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.resume_entries where id=r.id;
    perform private.write_delete_audit_system('resume_entry', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  -- resume_categories
  for r in select id, deleted_at from public.resume_categories where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    if not exists (select 1 from public.resume_entries where category_id=r.id and deleted_at is null) then
      delete from public.resume_categories where id=r.id;
      perform private.write_delete_audit_system('resume_category', r.id, r.id, 'hard_delete', 0, null, null);
      v_total := v_total + 1;
    end if;
  end loop;
  -- social_links
  for r in select id, deleted_at from public.social_links where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.social_links where id=r.id;
    perform private.write_delete_audit_system('social', r.id, r.id, 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;
  -- media_assets
  for r in select bucket, path, deleted_at from public.media_assets where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.media_assets where bucket=r.bucket and path=r.path;
    perform private.write_delete_audit_system('media_asset', r.path, r.path, 'hard_delete', 0, null, jsonb_build_object('bucket', r.bucket));
    v_total := v_total + 1;
  end loop;
  -- profile
  for r in select id, deleted_at from public.profile where deleted_at is not null and private.is_hard_delete_eligible(deleted_at) for update skip locked loop
    delete from public.profile where id=r.id;
    perform private.write_delete_audit_system('profile', r.id::text, 'profile', 'hard_delete', 0, null, null);
    v_total := v_total + 1;
  end loop;

  return jsonb_build_object('hard_deleted', v_total);
end;
$$;
revoke all on function public.cron_hard_delete_expired() from public;
grant execute on function public.cron_hard_delete_expired() to service_role;
