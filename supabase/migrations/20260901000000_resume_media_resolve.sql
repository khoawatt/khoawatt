create or replace function public.cms_resolve_resume_media(p_path text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_cnt int;
begin
  if not private.is_owner() then
    return jsonb_build_object('status','failed','errorCode','DELETE_NOT_ALLOWED');
  end if;
  delete from public.resume_media
  where (thumbnail_src = p_path or full_src = p_path)
    and resume_entry_id in (select id from public.resume_entries where deleted_at is null);
  get diagnostics v_cnt = row_count;
  return jsonb_build_object('status','deleted','deletedRows',v_cnt);
end;
$$;

revoke all on function public.cms_resolve_resume_media(text) from public;
grant execute on function public.cms_resolve_resume_media(text) to authenticated;
