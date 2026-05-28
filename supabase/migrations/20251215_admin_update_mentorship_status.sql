-- Admin mentorship status RPCs
begin;

create or replace function public.admin_update_mentee_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', ''));
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_status is null or p_status = '' then
    raise exception 'p_status is required';
  end if;

  if v_role not in ('admin', 'super_admin') then
    raise exception 'not_authorized';
  end if;

  update public.profiles
     set mentee_status = lower(p_status),
         updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;


create or replace function public.admin_update_mentor_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', ''));
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_status is null or p_status = '' then
    raise exception 'p_status is required';
  end if;

  if v_role not in ('admin', 'super_admin') then
    raise exception 'not_authorized';
  end if;

  update public.profiles
     set mentor_status = lower(p_status),
         updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;

commit;
