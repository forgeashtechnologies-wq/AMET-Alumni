begin;

set search_path = public;

create or replace function public.app_is_admin_of(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = p_user
        and p.role in ('admin','super_admin')
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.profile_id = p_user
        and lower(coalesce(r.name, '')) in ('admin','super_admin','super admin')
    );
$$;

commit;
