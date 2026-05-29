# API Reference — AMET Alumni Management Platform

## Overview

The AMET Alumni Management Platform uses Supabase as its backend. The frontend communicates directly with Supabase using:
- **Supabase JS Client** for data operations
- **RPC Functions** for complex business logic
- **Edge Functions** for serverless operations

## Authentication

All API calls require authentication via Supabase Auth.

### Login
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

### Logout
```javascript
const { error } = await supabase.auth.signOut()
```

### Get Current User
```javascript
const { data: { user } } = await supabase.auth.getUser()
```

## Database Tables

### profiles
User profile information

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.users.id) |
| email | text | User email |
| full_name | text | Full name |
| role | text | 'alumni', 'student', 'employer', 'admin', 'super_admin' |
| approved | boolean | Approval status |
| created_at | timestamptz | Creation timestamp |

### events
Event listings

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Event title |
| description | text | Event description |
| event_date | timestamptz | Event date/time |
| location | text | Event location |
| created_by | uuid | Creator user_id |
| status | text | 'draft', 'pending', 'approved', 'rejected' |

### job_postings
Job listings

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Job title |
| company_id | uuid | Company profile ID |
| description | text | Job description |
| requirements | text | Job requirements |
| posted_by | uuid | Employer user_id |
| status | text | 'active', 'paused', 'closed' |

### job_applications
Job applications

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| job_id | uuid | Reference to job_postings |
| applicant_id | uuid | Applicant user_id |
| status | text | 'pending', 'reviewed', 'accepted', 'rejected' |
| applied_at | timestamptz | Application timestamp |

### groups
Community groups

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Group name |
| description | text | Group description |
| created_by | uuid | Creator user_id |
| is_private | boolean | Privacy setting |
| status | text | 'active', 'archived' |

### mentors
Mentor profiles

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to profiles |
| expertise_areas | text[] | Array of expertise areas |
| availability | boolean | Accepting new mentees |
| max_mentees | integer | Maximum mentee capacity |

### mentorship_requests
Mentorship requests

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| mentor_id | uuid | Reference to mentors |
| mentee_id | uuid | Reference to profiles |
| status | text | 'pending', 'accepted', 'rejected', 'completed' |
| created_at | timestamptz | Request timestamp |

### messages
Direct messages

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| conversation_id | uuid | Conversation identifier |
| sender_id | uuid | Sender user_id |
| content | text | Message content |
| created_at | timestamptz | Message timestamp |

## RPC Functions

### get_user_role
Returns the role of a user.

```javascript
const { data, error } = await supabase.rpc('get_user_role', {
  user_id: 'uuid'
})
```

### fc_is_fully_approved
Checks if a user is fully approved.

```javascript
const { data, error } = await supabase.rpc('fc_is_fully_approved', {
  user_id: 'uuid'
})
```

### create_group_and_add_admin
Creates a new group and adds the creator as admin.

```javascript
const { data, error } = await supabase.rpc('create_group_and_add_admin', {
  group_name: 'text',
  description: 'text',
  is_private: boolean
})
```

### mentorship_request_respond
Responds to a mentorship request.

```javascript
const { data, error } = await supabase.rpc('mentorship_request_respond', {
  request_id: 'uuid',
  response: 'text' // 'accept' or 'reject'
})
```

### mentorship_toggle_availability
Toggles mentor availability.

```javascript
const { data, error } = await supabase.rpc('mentorship_toggle_availability', {
  mentor_id: 'uuid'
})
```

### get_or_create_conversation
Gets or creates a conversation between two users.

```javascript
const { data, error } = await supabase.rpc('get_or_create_conversation', {
  user_id_1: 'uuid',
  user_id_2: 'uuid'
})
```

### set_application_status
Updates job application status (employer/admin only).

```javascript
const { data, error } = await supabase.rpc('set_application_status', {
  application_id: 'uuid',
  new_status: 'text'
})
```

## Edge Functions

### set-role
Securely sets user role via admin API.

**Endpoint:** `/functions/v1/set-role`

**Method:** POST

**Access Control:**
Privileged admin endpoint. Do not call from frontend/client code. Access must be handled only through secure admin-controlled workflows during KT or by AMET's authorized technical team. Service-role keys must never be exposed in frontend code or general documentation.

**Body:**
```json
{
  "user_id": "uuid",
  "new_role": "alumni|student|employer|admin|super_admin"
}
```

### admin-invite-user
Invites a user via Supabase Admin API.

**Endpoint:** `/functions/v1/admin-invite-user`

**Method:** POST

**Access Control:**
Privileged admin endpoint. Do not call from frontend/client code. Access must be handled only through secure admin-controlled workflows during KT or by AMET's authorized technical team. Service-role keys must never be exposed in frontend code or general documentation.

**Body:**
```json
{
  "email": "user@example.com",
  "role": "alumni|student|employer|admin"
}
```

### event-reminders
Sends email reminders for upcoming events.

**Trigger:** Scheduled via Supabase cron jobs

**Environment Variables:**
- EMAIL_PROVIDER_API_KEY (if email provider is configured)

### mentor-matching
Mentor matching workflow (optional AI provider, if enabled by AMET).

**Endpoint:** `/functions/v1/mentor-matching`

**Method:** POST

**Environment Variables:**
- AI_PROVIDER_API_KEY (if AI provider is configured)

### send-feedback-notification
Sends email notifications for user feedback.

**Endpoint:** `/functions/v1/send-feedback-notification`

**Method:** POST

**Environment Variables:**
- EMAIL_PROVIDER_API_KEY (if email provider is configured)

## Storage Buckets

### avatars
User profile images

**Policies:**
- Public read access
- Owner can upload/update
- Admin can manage all

### resumes
User resume files

**Policies:**
- Owner can upload/update/delete
- Private (no public access)
- Signed URLs for sharing

### company-logos
Company profile logos

**Policies:**
- Public read access
- Employer owner can upload/update
- Admin can manage all

### event-images
Event images

**Policies:**
- Public read access
- Event creator can upload/update
- Admin can manage all

## Error Handling

All API calls follow this error pattern:

```javascript
const { data, error } = await supabase
  .from('table')
  .select('*')

if (error) {
  console.error('Error:', error.message)
  // Handle error
}
```

Common error codes:
- `PGRST116` - Not found
- `PGRST301` - Relation not found
- `PGRST302` - Column not found
- `42501` - Permission denied (RLS violation)

## Rate Limiting

Supabase enforces rate limits:
- 100 requests/second per project
- 50 concurrent connections
- Consider implementing client-side rate limiting for critical operations

## Best Practices

1. **Always check for errors** after every API call
2. **Use RPC functions** for complex operations that need transaction safety
3. **Never expose service_role_key** in frontend code
4. **Use RLS policies** for all data access control
5. **Implement optimistic updates** in UI for better UX
6. **Cache frequently accessed data** using React Query
7. **Use real-time subscriptions** for collaborative features
