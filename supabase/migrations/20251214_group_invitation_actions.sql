-- 20251214_group_invitation_actions.sql
-- Extend get_group_details_secure to surface invitation metadata
-- and add RPCs for invite acceptance / rejection

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
  v_invitation record;
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

    select id, status, inviter_id, invitee_id, invitee_email, created_at
    into v_invitation
    from public.group_invitations
    where group_id = p_group_id
      and invitee_id = auth.uid()
      and status = 'pending'
    order by created_at desc
    limit 1;
  end if;

  if v_group.is_private and not v_is_member then
    if v_invitation.id is not null then
      return jsonb_build_object(
        'status','invite_pending',
        'group', jsonb_build_object(
          'id', v_group.id,
          'name', v_group.name,
          'description', v_group.description,
          'tags', v_group.tags,
          'alumni_only', v_group.alumni_only,
          'is_private', true,
          'visibility', v_group.visibility,
          'invitation', jsonb_build_object(
            'status','pending',
            'inviter_id', v_invitation.inviter_id,
            'created_at', v_invitation.created_at
          )
        )
      );
    end if;

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

-- Accept invitation RPC
create or replace function public.accept_group_invitation(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation group_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invitation
  from public.group_invitations
  where group_id = p_group_id
    and invitee_id = v_user_id
    and status = 'pending'
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'No pending invitation found';
  end if;

  insert into public.group_members (group_id, user_id, role, status, joined_at)
  values (p_group_id, v_user_id, 'member', 'active', now())
  on conflict (group_id, user_id) do update
    set status = 'active', joined_at = now();

  update public.group_invitations
  set status = 'accepted', responded_at = now()
  where id = v_invitation.id;

  return 'accepted';
end;
$$;

grant execute on function public.accept_group_invitation(uuid) to authenticated;

-- Reject invitation RPC
create or replace function public.reject_group_invitation(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation group_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invitation
  from public.group_invitations
  where group_id = p_group_id
    and invitee_id = v_user_id
    and status = 'pending'
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'No pending invitation found';
  end if;

  update public.group_invitations
  set status = 'rejected', responded_at = now()
  where id = v_invitation.id;

  return 'rejected';
end;
$$;

grant execute on function public.reject_group_invitation(uuid) to authenticated;

commit;
