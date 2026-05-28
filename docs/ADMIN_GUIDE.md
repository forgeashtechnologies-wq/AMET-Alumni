# Admin Guide — AMET Alumni Portal

## Overview

This guide is for administrators managing the AMET Alumni Portal. It covers user management, approval workflows, and administrative tasks.

## Admin Roles

### Admin
- Can approve/reject users
- Can manage events
- Can view all user profiles
- Can moderate groups
- Can view analytics and reports

### Super Admin
- All admin permissions
- Can manage other admins
- Can delete users
- Can access all system settings
- Can manage database directly

## User Management

### Approving New Users

1. Navigate to Admin Dashboard → User Management
2. Find pending users in the "Pending Approval" list
3. Review user profile information
4. Click "Approve" or "Reject"
5. User will receive email notification

### Changing User Roles

1. Go to User Management
2. Find the user
3. Click "Edit Role"
4. Select new role:
   - **alumni** - Graduate users
   - **student** - Current students
   - **employer** - Company representatives
   - **admin** - Platform administrators
   - **super_admin** - Full system access

**Important:** Only super_admin can promote users to admin or super_admin.

### Viewing User Profiles

1. Navigate to User Management
2. Click on any user to view their full profile
3. View:
   - Personal information
   - Approval status
   - Activity history
   - Mentorship status
   - Job applications (if applicable)

## Event Management

### Creating Events

1. Go to Admin Dashboard → Events
2. Click "Create Event"
3. Fill in event details:
   - Title
   - Description
   - Date and time
   - Location
   - Maximum attendees (optional)
4. Set event visibility (public/private)
5. Click "Create"

### Moderating Events

1. Go to Events → Moderation
2. Review pending events
3. Approve or reject based on:
   - Event relevance to alumni
   - Appropriate content
   - Compliance with guidelines
4. Approved events become visible to users

### Viewing Event Analytics

1. Go to Events → Analytics
2. View:
   - Registration counts
   - Attendance rates
   - Feedback scores
   - Popular event types

## Group Moderation

### Approving Groups

1. Go to Admin Dashboard → Groups
2. Review pending group requests
3. Check:
   - Group purpose
   - Appropriate content
   - Compliance with community guidelines
4. Approve or reject

### Managing Group Content

1. Navigate to Groups → Content Moderation
2. Review flagged posts
3. Take action:
   - Remove inappropriate content
   - Warn users
   - Ban repeat offenders

## Job Portal Management

### Reviewing Job Postings

1. Go to Admin Dashboard → Jobs
2. Review new job postings
3. Verify:
   - Company legitimacy
   - Job description appropriateness
   - Compliance with hiring laws
4. Approve or reject

### Managing Employer Accounts

1. Go to User Management → Employers
2. Review employer profiles
3. Verify company information
4. Approve employer accounts
5. Monitor job posting activity

## Mentorship Management

### Approving Mentor Profiles

1. Go to Admin Dashboard → Mentorship
2. Review pending mentor applications
3. Check:
   - Relevant experience
   - Expertise areas
   - Availability
4. Approve qualified mentors

### Monitoring Mentorship Activity

1. Go to Mentorship → Analytics
2. View:
   - Active mentorship relationships
   - Request success rates
   - Mentor availability
   - Mentee satisfaction

## Analytics & Reports

### User Activity Reports

1. Go to Admin Dashboard → Analytics
2. View:
   - Daily active users
   - New registrations
   - User engagement metrics
   - Role distribution

### Feature Usage Reports

1. Navigate to Analytics → Feature Usage
2. View usage by module:
   - Jobs portal
   - Events
   - Groups
   - Mentorship
   - Messaging

### Feedback Reports

1. Go to Admin Dashboard → Feedback
2. Review user feedback
3. Categorize by:
   - Bug reports
   - Feature requests
   - General feedback
4. Track resolution status

## Security & Compliance

### Monitoring Suspicious Activity

1. Go to Admin Dashboard → Security
2. Review:
   - Failed login attempts
   - Unusual activity patterns
   - Reported users
3. Take action:
   - Lock suspicious accounts
   - Reset passwords
   - Contact users directly

### Data Privacy

- Never share user PII (Personally Identifiable Information)
- Only access user data when necessary
- Follow data retention policies
- Report data breaches immediately

## Common Admin Tasks

### Resetting User Password

Users can reset their own password via the "Forgot Password" link. Admins cannot directly reset passwords for security reasons.

### Deleting User Accounts

1. Go to User Management
2. Find the user
3. Click "Delete Account"
4. Confirm deletion
5. User data is anonymized (not completely deleted for audit purposes)

**Important:** Only super_admin can delete accounts. This action cannot be undone.

### Banning Users

1. Go to User Management
2. Find the user
3. Click "Ban User"
4. Select ban reason
5. User loses all access immediately

## Emergency Procedures

### System Outage

1. Check Supabase status: https://status.supabase.com
2. Check Vercel status: https://vercel-status.com
3. Notify users via email if extended outage
4. Document incident for post-mortem

### Security Incident

1. Immediately change all admin passwords
2. Review recent admin activity logs
3. Check for unauthorized data access
4. Notify ForgeAsh Technologies: connect@forgeash.in
5. Document all actions taken

### Data Breach

1. Immediately isolate affected systems
2. Notify ForgeAsh Technologies
3. Review affected user data
4. Notify affected users per compliance requirements
5. Document breach and response

## Best Practices

1. **Regular Reviews**: Review pending approvals daily
2. **Documentation**: Document all admin actions
3. **Communication**: Respond to user inquiries promptly
4. **Security**: Use strong, unique passwords
5. **Training**: Stay updated on platform features
6. **Collaboration**: Work with other admins for major decisions

## Contact Information

- **ForgeAsh Technologies**: connect@forgeash.in | +91 63691 26439
- **Emergency Support**: Available 24/7 for critical issues

## Training Resources

- Review ARCHITECTURE.md for system understanding
- Review API_REFERENCE.md for technical details
- Review ROLE_MODULE_ACTION_MATRIX.md for permission details
