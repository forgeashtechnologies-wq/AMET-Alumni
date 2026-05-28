begin;

drop function if exists public.admin_restore_user(uuid);
drop function if exists public.admin_restore_user(uuid, text);

create function public.admin_restore_user(
  target uuid,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := public.app_is_admin();
  caller_is_super boolean := public.is_super_admin();
  v_old public.profiles;
  v_new public.profiles;
begin
  if caller_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not caller_is_admin then
    raise exception 'Only admins can restore users' using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  select * into v_old
  from public.profiles
  where id = target;

  if not found then
    raise exception 'Profile % not found', target using errcode = 'P0002';
  end if;

  if v_old.role = 'super_admin' and not caller_is_super then
    raise exception 'Only super_admin may restore a super_admin' using errcode = '42501';
  end if;

  if coalesce(v_old.is_deleted, false) = false then
    raise exception 'User is not deleted' using errcode = 'P0001';
  end if;

  update public.profiles p
  set
    is_deleted = false,
    is_active = true
  where p.id = target
  returning * into v_new;

  if v_new.is_active then
    insert into public.activity_log(
      description,
      activity_type,
      user_id,
      metadata
  )
  values (
    'Admin restored user',
    'admin_restore_user',
    caller_id,
    jsonb_build_object(
      'target_user_id', target,
      'old_is_deleted', v_old.is_deleted,
      'old_is_active', v_old.is_active,
      'new_is_deleted', v_new.is_deleted,
      'new_is_active', v_new.is_active,
      'reason', p_reason
    )
  );

  end if;

  insert into public.admin_actions(
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  )
  values (
    caller_id,
    'restore_user',
    'profile',
    target,
    'Admin restored soft-deleted user',
    jsonb_build_object(
      'old', to_jsonb(v_old),
      'new', to_jsonb(v_new),
      'reason', p_reason
    )
  );

  return v_new;
end;
$$;

create function public.admin_restore_user(target uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.admin_restore_user(target, null);
end;
$$;

revoke all on function public.admin_restore_user(uuid) from anon;
revoke all on function public.admin_restore_user(uuid, text) from anon;

grant execute on function public.admin_restore_user(uuid) to authenticated;
grant execute on function public.admin_restore_user(uuid, text) to authenticated;

commit;
