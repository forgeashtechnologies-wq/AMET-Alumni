begin;

create or replace function public.request_connection_for_job(p_job_id uuid)
returns table(connection_id uuid, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select j.posted_by
  into v_owner
  from public.jobs j
  where j.id = p_job_id;

  if v_owner is null or v_owner = auth.uid() then
    raise exception 'Invalid or self connection' using errcode = 'P0001';
  end if;

  insert into public.connections as c (requester_id, recipient_id, status)
  values (auth.uid(), v_owner, 'pending')
  on conflict do nothing
  returning c.id, c.status into v_id, v_status;

  if v_id is null then
    select c.id, c.status
    into v_id, v_status
    from public.connections c
    where c.requester_id = auth.uid()
      and c.recipient_id = v_owner
    limit 1;
  end if;

  return query select v_id, v_status;
end;
$$;

revoke all on function public.request_connection_for_job(uuid) from anon;
grant execute on function public.request_connection_for_job(uuid) to authenticated;

commit;
