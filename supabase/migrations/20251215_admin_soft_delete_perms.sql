-- Allow admins (not just super admins) to soft-delete users while keeping purge/hard delete super-admin only
begin;

drop function if exists public.admin_soft_delete_user(uuid);
drop function if exists public.admin_soft_delete_user(uuid, text);

create function public.admin_soft_delete_user(
  target uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := public.app_is_admin();
  caller_is_super boolean := public.is_super_admin();
  v_old public.profiles;
  v_super_admin_count integer;
begin
  if not caller_is_admin then
    raise exception 'Only admins can soft-delete users' using errcode = '42501';
  end if;

  if caller_id = target then
    raise exception 'You cannot soft-delete your own account' using errcode = 'P0001';
  end if;

  select * into v_old
  from public.profiles
  where id = target;

  if not found then
    raise exception 'Profile % not found', target using errcode = 'P0002';
  end if;

  if v_old.role = 'super_admin' then
    if not caller_is_super then
      raise exception 'Only super_admin may soft-delete a super_admin' using errcode = '42501';
    end if;

    select count(*)
    into v_super_admin_count
    from public.profiles
    where role = 'super_admin'
      and coalesce(is_deleted, false) = false;

    if v_super_admin_count = 1 then
      raise exception 'Cannot soft-delete the last super_admin' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
     set is_deleted = true,
         is_active  = false
   where id = target;

  insert into public.activity_log(
    description,
    activity_type,
    user_id,
    metadata
  )
  values (
    'Admin soft-deleted user',
    'admin_soft_delete_user',
    caller_id,
    jsonb_build_object(
      'target_user_id', target,
      'old_role', v_old.role,
      'reason', p_reason
    )
  );
end;
$$;

create function public.admin_soft_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_soft_delete_user(target, null);
end;
$$;

commit;
