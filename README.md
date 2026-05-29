# AMET Alumni Management Platform

A comprehensive alumni engagement platform for AMET University, built with React 18, Supabase PostgreSQL, and Deno Edge Functions.

---

## System Overview

| Category | Detail |
|----------|--------|
| **Status** | Active in production and prepared for handover review |
| **Uptime** | Based on available handover records, no unresolved critical handover blockers are reported as of the handover date |
| **Users** | 5 roles across 10 modules |
| **Features** | 74 delivered |
| **Database** | 105 tables, 559 functions, 404 RLS policies |
| **Frontend** | React 18.3.1 on Vercel |
| **Backend** | Supabase Cloud (PostgreSQL 15) |

---

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase project (https://supabase.com)
- Vercel account (https://vercel.com)

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and add your Supabase credentials
npm start
```

### Backend Setup (Supabase)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run all migrations
supabase migration up
```

---

## Architecture

```
Client Browser
     │
     ▼
Vercel CDN (Frontend)
     │
     ▼
React 18 + TailwindCSS
     │
     ▼
Supabase (Backend)
├── PostgreSQL 15 (Database)
├── GoTrue (Authentication)
├── Storage (Files & Media)
├── Edge Functions (Deno)
│   ├── event-reminders
│   ├── mentor-matching (optional provider configuration, if enabled by AMET)
│   └── send-feedback-notification
└── Row-Level Security (Authorization)
```

---

## Documentation

**Note: The GitHub documentation is a supporting technical reference for architecture, deployment, environment setup, RLS, API/integration overview, admin operations, and troubleshooting. The formal client-facing handover package is provided separately through the Master Handover Package, Transition Documents, and Handover Acknowledgement.**

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System design & components |
| [Deployment](./docs/DEPLOYMENT.md) | Vercel & Supabase setup |
| [Environment](./docs/ENVIRONMENT.md) | Required environment variables |
| [Troubleshooting](./docs/TROUBLESHOOTING.md) | Common issues & fixes |
| [RLS Policies](./docs/RLS_POLICIES.md) | Row-Level Security documentation |
| [API Reference](./docs/API_REFERENCE.md) | Database tables & RPC functions |
| [Admin Guide](./docs/ADMIN_GUIDE.md) | Administration procedures |
| [Security Configuration Summary](./docs/SECURITY_CONFIGURATION_SUMMARY.md) | High-level security configuration reference |
| [Role Matrix](./docs/ROLE_MODULE_ACTION_MATRIX.md) | Permission matrix by role |

---

## User Roles

| Role | Access |
|------|--------|
| **Super Admin** | Full system access |
| **Admin** | User & content moderation |
| **Alumni** | Directory, jobs, events, mentorship, groups |
| **Student** | Limited directory, jobs, events |
| **Employer** | Job posting & applications |

---

## Support

**ForgeAsh Technologies**
- Email: connect@forgeash.in
- Phone may be used for scheduling/coordination only.
- Website: forgeash.in

---

*Built and delivered by ForgeAsh Technologies, Chennai.*
*Platform live since December 2025.*
