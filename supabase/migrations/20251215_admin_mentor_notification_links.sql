-- Ensure mentor notifications carry entity metadata that maps to admin profile view links
create or replace function public.notify_admin_new_mentor_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  select coalesce(full_name, first_name || ' ' || last_name, email, 'A member')
    into v_full_name
  from public.profiles
  where id = new.user_id;

  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.notify_admin(
        'alert',
        'New mentor application',
        v_full_name || ' has submitted a mentor application.',
        '/admin/mentor-approvals',
        'info',
        'mentor',
        new.user_id,
        true,
        jsonb_build_object(
          'entity_type', 'profile',
          'entity_id', new.user_id::text,
          'mentor_user_id', new.user_id::text,
          'status', new.status
        )
      );
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'pending' and new.status is distinct from old.status then
      perform public.notify_admin(
        'alert',
        'Mentor application requires review',
        v_full_name || '''s mentor profile returned to pending status.',
        '/admin/mentor-approvals',
        'warning',
        'mentor',
        new.user_id,
        true,
        jsonb_build_object(
          'entity_type', 'profile',
          'entity_id', new.user_id::text,
          'mentor_user_id', new.user_id::text,
          'status', new.status
        )
      );
    end if;
  end if;

  return new;
end;
$$;
