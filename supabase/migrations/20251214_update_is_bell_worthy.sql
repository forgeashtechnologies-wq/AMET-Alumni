-- 20251214_update_is_bell_worthy.sql
-- Ensure canonical group notification types are visible in bell feed

begin;

create or replace function public.is_bell_worthy(p_role text, p_type text, p_metadata jsonb default '{}'::jsonb)
returns boolean
language plpgsql
set search_path to 'public', 'auth', 'extensions'
as $$
declare
  v_role text := lower(coalesce(p_role, 'alumni'));
  v_type text := lower(coalesce(p_type, 'system'));
  v_audience text := lower(coalesce(p_metadata->>'audience', 'user'));
  v_general_types text[] := ARRAY[
    'connection','connection_request',
    'message','chat_message',
    'job','job_posted','job_approved','job_applied',
    'application','application_status',
    'event','event_created','event_published',
    'mentorship',
    'system','alert'
  ];
  v_group_types text[] := ARRAY[
    'group',
    'group_join_request',
    'group_membership_approved',
    'group_membership_rejected',
    'group_admin_risk',
    'group_invite_received',
    'group_invite_accepted',
    'group_approved',
    'group_rejected',
    'group_deleted'
  ];
begin
  if v_role in ('', 'anon', 'user') then
    v_role := 'alumni';
  end if;

  if v_type in (
    'rsvp_confirmation',
    'application_submitted',
    'mentorship_reminder',
    'generic_toast'
  ) then
    return false;
  end if;

  -- admin-audience notifications (admin bell only)
  if v_role in ('admin','super_admin') and v_audience = 'admin' then
    if v_type in ('alert','system','group_admin_risk','group_deleted','group_approved','group_rejected') then
      return true;
    else
      return false;
    end if;
  end if;

  if v_role in ('alumni','student') then
    if v_type = any(v_general_types || v_group_types) then
      return true;
    else
      return false;
    end if;
  end if;

  if v_role = 'employer' then
    if v_type = any(v_general_types) then
      return true;
    else
      return false;
    end if;
  end if;

  if v_role = 'mentor' then
    if v_type in ('mentorship','message','chat_message','event','system','alert') then
      return true;
    else
      return false;
    end if;
  end if;

  if v_role in ('admin','super_admin') then
    if v_type = any(v_general_types || v_group_types) then
      return true;
    else
      return false;
    end if;
  end if;

  if v_type = any(v_general_types || v_group_types) then
    return true;
  end if;

  return false;
end;
$$;

-- Recreate bell_notifications view to pick up new helper

drop view if exists public.bell_notifications;
create view public.bell_notifications as
select
  n.id,
  n.recipient_id,
  n.type,
  n.title,
  n.message,
  coalesce(n.link, public.derive_notification_link(n.type, n.metadata, n.link)) as link,
  n.metadata,
  n.is_read,
  n.read_at,
  n.created_at
from notifications n
left join notification_preferences p
  on p.user_id = n.recipient_id
 and p.notification_type = n.type
where
  coalesce(p.in_app_enabled, true) = true
  and not lower(coalesce(n.title, '')) like 'rsvp confirmed%'
  and is_bell_worthy(get_user_role(n.recipient_id), n.type, n.metadata)
order by n.created_at desc;

grant select on public.bell_notifications to authenticated;

commit;
