# System Architecture — AMET Alumni Management Platform

## Quick Overview

A role-based alumni management platform for AMET University with 5 user roles, 10 modules, and 74 features. Built on modern cloud infrastructure with role-based and RLS-backed access control.

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.3.1 |
| Routing | React Router | 7.5.1 |
| Styling | TailwindCSS + MUI | 3.4.17 + 5.18.0 |
| Data fetching | TanStack Query | 5.80.7 |
| Database | PostgreSQL (Supabase) | 15 |
| Auth | Supabase GoTrue | JWT |
| Storage | Supabase Storage | S3-compatible |
| Edge Runtime | Deno | TypeScript |
| Frontend Host | Vercel | Edge CDN |
| Backend Host | Supabase Cloud | Managed |

### Database Scale

| Metric | Count |
|--------|-------|
| Tables | 105 |
| Functions | 559 |
| Triggers | 777 |
| RLS Policies | 404 |
| Indexes | 470+ |

### Edge Functions
- **event-reminders** — Email notification workflow for upcoming events (subject to provider configuration, if enabled by AMET)
- **mentor-matching** — Mentor matching workflow (optional AI provider, if enabled by AMET)
- **send-feedback-notification** — Email on feedback submission

### Security Model
Authorization is enforced at THREE layers:
1. **Client-side guards** — UI hides restricted elements
2. **API permission checks** — Supabase SDK validates operations
3. **PostgreSQL RLS** — Database-level enforcement (source of truth)

### Storage Buckets
| Bucket | Privacy | Purpose |
|--------|---------|---------|
| avatars, profile-images | Public | Profile photos |
| resumes, cover-letters | Private | Career documents |
| message_attachments | Private | Conversation media |
| event-images | Public | Event banners |

---
