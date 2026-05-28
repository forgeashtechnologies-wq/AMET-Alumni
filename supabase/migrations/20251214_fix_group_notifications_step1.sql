-- 20251214_fix_group_notifications_step1.sql
-- Step 1: ensure invite_member_by_email emits canonical notifications via notify_validated

begin;

create or replace function public.invite_member_by_email(p_group_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_caller_id     uuid := auth.uid();
  v_caller_role   text;
  v_group         public.groups%rowtype;
  v_invitee_prof  public.profiles%rowtype;
  v_invitation_id uuid;
  v_has_invitee   boolean := false;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Per-user invite rate limit: 5 per day
  perform public.increment_group_rate_limit('group_invite', 5, '1 day');

  -- Caller role
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role = 'employer' then
    raise exception 'Employers cannot send group invites';
  end if;

  -- Group must exist and be active
  select * into v_group from public.groups where id = p_group_id;
  if not found then
    raise exception 'Group not found';
  end if;
  if v_group.is_archived then
    raise exception 'Cannot invite to archived group';
  end if;
  if v_group.approval_status is not null and v_group.approval_status <> 'approved' then
    raise exception 'Cannot invite to unapproved group';
  end if;

  -- Caller must already be a member
  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = v_caller_id
  ) then
    raise exception 'Only group members can send invites';
  end if;

  -- Resolve invitee by email (if they already have an account)
  select * into v_invitee_prof
  from public.profiles
  where lower(email) = lower(p_email)
  limit 1;
  v_has_invitee := found;

  -- Block employers as invitees
  if v_has_invitee and v_invitee_prof.role = 'employer' then
    raise exception 'Cannot invite employers to groups';
  end if;

  -- Alumni-only restriction: block students
  if v_has_invitee and v_group.alumni_only and v_invitee_prof.role = 'student' then
    raise exception 'This group is alumni-only. Students cannot be invited.';
  end if;

  -- If user already member, no invite
  if v_has_invitee and exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = v_invitee_prof.id
  ) then
    raise exception 'User is already a member of this group';
  end if;

  -- Create (or upsert) pending invite
  insert into public.group_invitations (
    group_id,
    inviter_id,
    invitee_id,
    invitee_email,
    status
  )
  values (
    p_group_id,
    v_caller_id,
    case when v_has_invitee then v_invitee_prof.id else null end,
    lower(p_email),
    'pending'
  )
  on conflict (group_id, invitee_id)
    where invitee_id is not null and status = 'pending'
  do update set
    updated_at = now()
  returning id into v_invitation_id;

  -- Notification only if invitee has an account
  if v_has_invitee then
    perform public.notify_validated(
      v_invitee_prof.id,
      'group_invite_received',
      'Group invitation',
      'You have been invited to join "' || v_group.name || '"',
      '/groups/' || p_group_id::text,
      jsonb_build_object(
        'group_id', p_group_id::text,
        'entity_type', 'group',
        'group_name', v_group.name,
        'inviter_id', v_caller_id::text,
        'audience', 'user'
      )
    );
  end if;

  return v_invitation_id;
end;
$$;

commit;
