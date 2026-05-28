-- Ensure unique rows per (event_id, user_id) on event_rsvps for clean upserts
create unique index if not exists event_rsvps_event_user_uniq
  on public.event_rsvps (event_id, user_id);

-- Refresh v_my_event_rsvp to expose volunteer preference
create or replace view public.v_my_event_rsvp as
select
  ea.event_id,
  lower(coalesce(ea.attendance_status, '')) as attendance_status,
  ea.is_waitlisted,
  coalesce(r.wants_to_volunteer, false) as wants_to_volunteer
from public.event_attendees ea
left join public.event_rsvps r
  on r.event_id = ea.event_id
 and r.user_id = ea.user_id
where ea.user_id = auth.uid();
