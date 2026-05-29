# Security Configuration Summary — AMET Alumni Management Platform

This document provides a high-level summary of the platform security configuration for handover reference. It is not a penetration test report, compliance certificate, or independent security certification.

## Security Model

* Authentication is handled through Supabase Auth.
* Authorization is enforced through role-based access control and PostgreSQL Row Level Security policies.
* User access is governed by assigned role and approval state.
* Sensitive administrative operations must be handled only by authorized AMET/administrator accounts.

## Access Control

* The platform uses the roles: alumni, student, employer, admin, and super_admin.
* RLS-backed access control is the primary database-level enforcement mechanism.
* Frontend route guards and UI permissions support usability but do not replace database-level access control.

## Secrets and Environment Variables

* Secrets and environment variables must be managed through platform dashboards such as Vercel and Supabase.
* Service-role keys must never be exposed in frontend code or general documentation.
* AMET should rotate and manage credentials after ownership/access transfer.

## Storage and Files

* Supabase Storage is used for files such as avatars, resumes, event images, and attachments.
* Storage policies should be reviewed and maintained by the owning technical team after handover.
* AMET should periodically review bucket access rules as part of regular operations.

## Handover Notes

* This summary is provided for operational reference.
* Detailed security review, penetration testing, compliance certification, production monitoring, and future hardening are outside the standard handover clarification scope unless separately agreed.
* AMET becomes responsible for security operations, vendor configuration, credential management, and ongoing audits after technical ownership/access transfer.
