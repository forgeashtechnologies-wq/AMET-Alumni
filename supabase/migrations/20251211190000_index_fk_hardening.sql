-- Index and FK hardening for AMS-AMET
-- NOTE: Run during a low-traffic window; this migration may briefly lock affected tables.

-----------------------------
-- 1) Duplicate index cleanup
-----------------------------

-- profiles: keep canonical indexes only
DROP INDEX IF EXISTS public.idx_profiles_name;                       -- duplicate of idx_profiles_full_name
DROP INDEX IF EXISTS public.idx_profiles_graduation_year;            -- duplicate of idx_profiles_grad_year
DROP INDEX IF EXISTS public.idx_profiles_public_flags;               -- duplicate of idx_profiles_approval_visibility

-- social_links: keep social_links_profile_id_type_key as the single unique
ALTER TABLE public.social_links
  DROP CONSTRAINT IF EXISTS ux_social_links_profile_type;

-- notification_preferences: keep notification_preferences_user_id_notification_type_key
DROP INDEX IF EXISTS public.idx_notification_preferences_user_type;  -- redundant unique index
ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_unique_user_type;  -- duplicate unique constraint

-- notifications: collapse redundant recipient/time indexes
-- (a) recipient_id, created_at DESC
DROP INDEX IF EXISTS public.notifications_recipient_created_idx;     -- duplicate of idx_notifications_recipient_created_at

-- (b) recipient_id, is_read, created_at DESC
DROP INDEX IF EXISTS public.idx_notifications_recipient_created;     -- duplicate of idx_notifications_inbox
DROP INDEX IF EXISTS public.idx_notifications_recipient_is_read_created_at;
DROP INDEX IF EXISTS public.idx_notifications_recipient_isread_created_at;
DROP INDEX IF EXISTS public.idx_notifications_recipient_read_created;

-- (c) recipient_id, type WHERE is_read = false
DROP INDEX IF EXISTS public.idx_notifications_recipient_type_unread; -- duplicate of idx_notifications_unread_per_user

-- mentorship_requests: keep ux_mentorship_pending_once as canonical pending-unique
DROP INDEX IF EXISTS public.idx_mentorship_requests_pending_unique;
DROP INDEX IF EXISTS public.idx_mentorship_requests_unique_pending;
DROP INDEX IF EXISTS public.mentorship_requests_mentor_mentee_pending_uidx;
DROP INDEX IF EXISTS public.mentorship_requests_unique_pending;
DROP INDEX IF EXISTS public.ux_mentorship_requests_pending;

-- mentorship_sessions: keep idx_mentorship_sessions_request_id
DROP INDEX IF EXISTS public.mentorship_sessions_request_id_idx;

-- messages: keep idx_messages_conversation_created
DROP INDEX IF EXISTS public.idx_messages_conversation;

-- profile_approval_audit: keep one index per (admin_id, created_at) and (profile_id, created_at)
DROP INDEX IF EXISTS public.idx_profile_approval_audit_admin_created_at;
DROP INDEX IF EXISTS public.idx_profile_approval_audit_profile_created_at;


--------------------------------------
-- 2) Add missing foreign key indexes
--------------------------------------

-- conversations: participants
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1
  ON public.conversations (participant_1);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_2
  ON public.conversations (participant_2);

-- conversation_members / conversation_participants: user lookups
CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON public.conversation_members (user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON public.conversation_participants (user_id);

-- events: attendees and feedback
CREATE INDEX IF NOT EXISTS idx_event_attendees_attendee
  ON public.event_attendees (attendee_id);

CREATE INDEX IF NOT EXISTS idx_event_feedback_user
  ON public.event_feedback (user_id);

-- profiles-related FKs
CREATE INDEX IF NOT EXISTS idx_achievements_profile
  ON public.achievements (profile_id);

CREATE INDEX IF NOT EXISTS idx_education_history_user
  ON public.education_history (user_id);

-- companies & moderation flows
CREATE INDEX IF NOT EXISTS idx_companies_created_by
  ON public.companies (created_by);

CREATE INDEX IF NOT EXISTS idx_content_approvals_reviewer
  ON public.content_approvals (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_content_moderation_moderator
  ON public.content_moderation (moderator_id);
