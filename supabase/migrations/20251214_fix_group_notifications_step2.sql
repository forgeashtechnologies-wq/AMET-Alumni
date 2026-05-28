-- 20251214_fix_group_notifications_step2.sql
-- Step 2: backfill legacy notifications and seed preference defaults

begin;

-- Backfill legacy group notifications with canonical metadata + type mapping
with updated as (
  update public.notifications n
  set
    metadata = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object(
      'group_id', n.group_id::text,
      'entity_type', 'group',
      'audience', coalesce(n.metadata->>'audience', 'user')
    ),
    type = case
      when n.type = 'group' and n.message ilike 'You have been invited%'
        then 'group_invite_received'
      else n.type
    end
  where n.type = 'group'
    and n.group_id is not null
)
select count(*) as backfilled_rows from updated;

-- Ensure all canonical group_* rows have group metadata
with enriched as (
  update public.notifications n
  set metadata = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object(
    'group_id', n.group_id::text,
    'entity_type', 'group'
  )
  where n.type like 'group_%'
    and n.group_id is not null
    and (n.metadata->>'group_id') is null
)
select count(*) as enriched_rows from enriched;

-- Seed notification preferences for new group-related types (enabled by default)
with new_types as (
  select unnest(array[
    'group_invite_received'::text,
    'group_invite_accepted',
    'group_join_request',
    'group_membership_approved',
    'group_membership_rejected',
    'group_admin_risk',
    'group_approved',
    'group_rejected',
    'group_deleted'
  ]) as notification_type
),
user_pool as (
  select distinct user_id from public.notification_preferences
)
insert into public.notification_preferences (user_id, notification_type, in_app_enabled)
select u.user_id, t.notification_type, true
from user_pool u
cross join new_types t
left join public.notification_preferences p
  on p.user_id = u.user_id and p.notification_type = t.notification_type
where p.user_id is null;

commit;
