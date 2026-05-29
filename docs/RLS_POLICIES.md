# RLS Policies — AMET Alumni Management Platform

## Overview

Row Level Security (RLS) is the primary security mechanism in the AMET Alumni Management Platform. All sensitive tables have RLS enabled with policies that enforce role-based access control.

## Core RLS Principles

1. **Authentication Required**: All tables require authenticated users (no anonymous access)
2. **Role-Based Access**: Policies check user role from `auth.uid()` and `profiles.role`
3. **Ownership Checks**: Users can only access their own data unless they have admin privileges
4. **Approval State**: Many features require users to be fully approved before access

## Key Tables & Policies

### profiles
- **SELECT**: Users can view all profiles (for directory) but sensitive fields are restricted
- **UPDATE**: Users can only update their own profile
- **DELETE**: Only super_admin can delete profiles
- **INSERT**: Handled by Supabase Auth triggers

### events
- **SELECT**: All authenticated users can view approved/published events
- **INSERT**: Only admin and super_admin can create events
- **UPDATE**: Only event creator or admin can update
- **DELETE**: Only super_admin can delete

### event_rsvps
- **SELECT**: Users can view their own RSVPs
- **INSERT**: Authenticated users can RSVP (with approval checks)
- **UPDATE**: Users can cancel their own RSVPs
- **DELETE**: Users can delete their own RSVPs

### job_postings
- **SELECT**: All authenticated users can view active job postings
- **INSERT**: Only approved employers can post jobs
- **UPDATE**: Only job owner (employer) or admin can update
- **DELETE**: Only job owner or super_admin can delete

### job_applications
- **SELECT**: Users can view their own applications; employers can view applications for their jobs
- **INSERT**: Only alumni and students can apply to jobs
- **UPDATE**: Only employer (job owner) or admin can update application status
- **DELETE**: Only applicant can withdraw their application

### groups
- **SELECT**: Public groups visible to all; private groups only to members
- **INSERT**: Only alumni and admins can create groups
- **UPDATE**: Only group admin or site admin can update
- **DELETE**: Only super_admin can delete groups

### group_members
- **SELECT**: Users can view group membership for groups they're in
- **INSERT**: Approved users can join public groups; private groups require approval
- **UPDATE**: Only group admin can promote/demote members
- **DELETE**: Users can leave groups; admins can remove members

### mentors
- **SELECT**: All users can view approved mentors
- **INSERT**: Alumni can create mentor profiles
- **UPDATE**: Only mentor (owner) or admin can update
- **DELETE**: Only super_admin can delete

### mentorship_requests
- **SELECT**: Users can view their own requests; mentors can view requests to them
- **INSERT**: Approved alumni and students can request mentorship
- **UPDATE**: Only mentor or admin can respond to requests
- **DELETE**: Requester can cancel their request

### messages
- **SELECT**: Users can only view messages in conversations they're part of
- **INSERT**: Users can only send to conversations they're part of
- **UPDATE**: Not allowed (messages are immutable)
- **DELETE**: Only super_admin can delete messages

## Admin Tables

### activity_logs
- **SELECT**: Only admin and super_admin
- **INSERT**: Automatic via triggers
- **UPDATE**: Not allowed
- **DELETE**: Only super_admin

### admin_actions
- **SELECT**: Only admin and super_admin
- **INSERT**: Automatic via triggers
- **UPDATE**: Not allowed
- **DELETE**: Only super_admin

### user_feedback
- **SELECT**: Only admin and super_admin
- **INSERT**: All authenticated users
- **UPDATE**: Only submitter or admin
- **DELETE**: Only super_admin

## Helper Functions Used in RLS

- `get_user_role(uuid)` - Returns user role from profiles
- `is_site_admin(uuid)` - Checks if user is admin or super_admin
- `fc_is_fully_approved(uuid)` - Checks if user is fully approved
- `is_group_admin(uuid, int)` - Checks if user is admin of a specific group

## Security Notes

1. **Never disable RLS** on production tables
2. **Always test new policies** in a development environment first
3. **Use SECURITY DEFINER** for helper functions to allow RLS to call them
4. **Monitor policy performance** - complex policies can slow down queries
5. **Audit policy changes** - all RLS changes should be reviewed

## Viewing Current Policies

To view all RLS policies in the database:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Testing RLS

Always test RLS policies from different user perspectives:

```sql
-- Test as regular user
SET ROLE authenticated;
SELECT * FROM profiles WHERE id = 'test-user-id';

-- Test as admin
SET ROLE postgres;
SELECT * FROM profiles;
```
