begin;

drop policy if exists profiles_select_connected_users on public.profiles;

create policy profiles_select_connected_users
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.connections c
    where (
      (c.requester_id = auth.uid() and c.recipient_id = profiles.id)
      or
      (c.recipient_id = auth.uid() and c.requester_id = profiles.id)
    )
      and c.status in ('pending', 'accepted')
  )
  and profiles.approval_status = 'approved'::profile_approval_status
  and coalesce(profiles.is_active, true) = true
);

commit;
