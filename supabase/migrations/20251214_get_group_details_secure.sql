-- 20251214_get_group_details_secure.sql
-- Add RPC to fetch sanitized group details for non-members and full details for authorized users

begin;

create or replace function public.get_group_details_secure(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_result jsonb;
begin
  select * into v_group from public.groups where id = p_group_id;
  if not found then
    return jsonb_build_object('status','not_found');
  end if;

  if auth.uid() is not null then
    select exists(
      select 1 from public.group_members
      where group_id = p_group_id and user_id = auth.uid()
    ) into v_is_member;
  end if;

  if v_group.is_private and not v_is_member then
    return jsonb_build_object(
      'status','restricted',
      'group', jsonb_build_object(
        'id', v_group.id,
        'name', v_group.name,
        'alumni_only', v_group.alumni_only,
        'is_private', true,
        'visibility', v_group.visibility
      )
    );
  end if;

  return jsonb_build_object(
    'status','ok',
    'group', to_jsonb(v_group)
  );
end;
$$;

grant execute on function public.get_group_details_secure(uuid) to authenticated;

commit;
