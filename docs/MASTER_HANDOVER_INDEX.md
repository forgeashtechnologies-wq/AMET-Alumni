# AMET Alumni Management Platform
# Master Handover Index

**Client:** AMET University (Academy of Maritime Education and Training)
**Service Provider:** ForgeAsh Technologies
**Handover Date:** 28/05/2026
**Version:** 1.0
**Classification:** Confidential

---

## QUICK REFERENCE

| Item | Detail |
|------|--------|
| Production URL | https://ametalumni.in |
| GitHub Repository | https://github.com/forgeashtechnologies-wq/AMET-Alumni |
| Supabase Project ID | gvbtfolcizkzihforqte |
| Supabase Dashboard | https://supabase.com/dashboard/project/gvbtfolcizkzihforqte |
| Domain | ametalumni.in (Hostinger — transfer to AMET required) |
| Platform Live Since | December 2025 |
| Handover Date | 28/05/2026 |
| ForgeAsh Contact | connect@forgeash.in / +91 63691 26439 |

---

## TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 18.3.1 |
| CSS Framework | TailwindCSS | 3.4.17 |
| Component Library | Material UI | 5.18.0 |
| Data Fetching | TanStack Query | 5.80.7 |
| Routing | React Router | 7.5.1 |
| Database | PostgreSQL (Supabase Cloud) | 15.8 |
| Authentication | Supabase GoTrue | JWT-based |
| Storage | Supabase Storage | S3-compatible |
| Edge Functions | Deno (TypeScript) | 3 functions |
| Frontend Hosting | Vercel | Auto-deploy |
| Backend Hosting | Supabase Cloud | Managed |
| Email Notifications | Optional provider configuration | Not required at handover unless enabled by AMET |
| Mentor Matching Workflow | Existing workflow | Optional provider configuration only if AMET enables it later |

---

## HOW TO NAVIGATE THIS PACKAGE

### ERP/IT Team (Vineeth's team) — Read in this order:
1. This document
2. GitHub: docs/ARCHITECTURE.md
3. GitHub: docs/DEPLOYMENT.md
4. GitHub: docs/ENVIRONMENT.md
5. GitHub: docs/RLS_POLICIES.md
6. GitHub: supabase/README.md
7. Excel: Delivered Scope Checklist
8. PDF/DOCX: Handover Acknowledgement & Signoff (sign Stage 1)

### Admin Team — Read in this order:
1. This document
2. GitHub: docs/ADMIN_GUIDE.md
3. GitHub: docs/TROUBLESHOOTING.md
4. Excel: Delivered Scope Checklist
5. Videos (within 14 days)

### University Management — Read in this order:
1. PPTX: Project Overview & System Status
2. Excel: Delivered Scope Checklist
3. DOCX: Handover Signoff (sign Stage 1)

---

## DOCUMENT INVENTORY

### What You Are Receiving

#### GitHub Repository (live at the link above)
All technical documentation is in the docs/ folder:

| File | Contents |
|------|----------|
| README.md | Project overview, quick start, architecture |
| docs/ARCHITECTURE.md | System design, tech stack, database scale |
| docs/DEPLOYMENT.md | Vercel setup, Supabase setup, deployment steps |
| docs/ENVIRONMENT.md | Required environment variables, where to find them |
| docs/RLS_POLICIES.md | Row-Level Security overview, 404 policies |
| docs/API_REFERENCE.md | Supabase APIs, edge functions, integrations |
| docs/ADMIN_GUIDE.md | Admin operations, user management, moderation |
| docs/TROUBLESHOOTING.md | Common issues, fixes, reference contacts |
| docs/MASTER_HANDOVER_INDEX.md | This document |
| frontend/README.md | Frontend setup and development guide |
| supabase/README.md | Database setup, migrations, edge functions |

#### Separate Documents (attached to handover email)
| Document | Format | Contents |
|----------|--------|----------|
| Project Overview & System Status | PPTX | Architecture, features, health score |
| Delivered Scope Checklist | XLSX | 74 features, 10 modules, RBAC matrix |
| Handover Acknowledgement & Signoff | DOCX | Legal terms, Stage 1 + Stage 2 signatures |

#### Delivered During KT Day 2
| Document | Format | Contents |
|----------|--------|----------|
| Access Transfer Register | DOCX | Every credential transferred, tracked |
| Credential Transfer Protocol | DOCX | Secure transfer method |
| Review/Stage 2 Completion Record | DOCX | Signed after handover complete |

#### Delivered Within 14 Days
| Video | Audience |
|-------|----------|
| Student Walkthrough | Students, Admin |
| Alumni Walkthrough | Alumni, Admin |
| Employer Walkthrough | Employers, Admin |
| Admin Walkthrough | Admin Team |
| Super Admin Walkthrough | ERP/IT Team |
| Technical Deployment Overview | ERP/IT Team |

---

## KT SESSION PLAN

### Day 1 (45 minutes) — System Overview
Date: TBD (May 29, 2026 or as confirmed)
Attendees: Ashwin (ForgeAsh) + Vineeth + ERP team

| Time | Topic |
|------|-------|
| 0:00-0:10 | System overview and architecture |
| 0:10-0:20 | Deployment flow (Vercel + Supabase) |
| 0:20-0:30 | Database orientation (Supabase dashboard) |
| 0:30-0:45 | Q&A on documentation |

### Day 2 (45 minutes) — Access Transfer
Date: TBD (May 30, 2026 or as confirmed)
Attendees: Ashwin (ForgeAsh) + Vineeth + ERP team

| Time | Topic |
|------|-------|
| 0:00-0:10 | GitHub repository access setup |
| 0:10-0:20 | Supabase access transfer |
| 0:20-0:30 | Vercel account setup (AMET creates new account) |
| 0:30-0:40 | Domain transfer initiation (ametalumni.in → Hostinger) |
| 0:40-0:45 | Stage 2 signoff |

### Before KT — AMET Must Provide:
- Official AMET email IDs for GitHub, Supabase, Vercel access
- Name and designation of authorized signatory
- Confirmation of May 29-30 availability

---

## POST-HANDOVER SUPPORT

**Duration:** 30 calendar days from Stage 2 sign-off
**Contact:** connect@forgeash.in | +91 63691 26439
**Response:** 48-96 business hours
**Channel:** Official support and documentation communication: [connect@forgeash.in](mailto:connect@forgeash.in)
**Note:** Phone may be used for scheduling/coordination only.

### Included (Clarification Only):
- Clarification on any handover document
- Clarification on existing application workflows
- Guidance on Supabase/Vercel/GitHub access
- Follow-up questions from KT sessions
- Help understanding existing features

### NOT Included:
- Bug fixes or code modifications
- Database or configuration changes
- New feature development
- Emergency or production support
- Additional training beyond KT + videos

Full terms: See Handover Acknowledgement document Section 13

---

## KNOWN ITEMS — AMET ACTION REQUIRED

| Item | Action Required | Where |
|------|----------------|-------|
| Leaked Password Protection | Enable (paid Supabase feature) | Supabase Dashboard → Auth → Advanced |
| Postgres 15.8 upgrade | Schedule during maintenance window | Supabase Dashboard |
| Vercel account | Create new account (ametalumni.in) | vercel.com |
| Domain transfer | Create Hostinger account, accept transfer | hostinger.in |

---

## IMPORTANT URLS

| Service | URL | Owner After Handover |
|---------|-----|---------------------|
| Production App | https://ametalumni.in | AMET University |
| GitHub Repo | https://github.com/forgeashtechnologies-wq/AMET-Alumni | AMET University |
| Supabase Dashboard | https://supabase.com/dashboard/project/gvbtfolcizkzihforqte | AMET University |
| Vercel Dashboard | https://vercel.com (new account) | AMET University |
| Domain Registrar | https://hostinger.in (new account) | AMET University |

---

## KEY CONTACTS

### ForgeAsh Technologies
| Role | Detail |
|------|--------|
| Name | R. Ashwin Kumar Pushanam |
| Designation | Founder & CEO |
| Email | connect@forgeash.in |
| Phone | +91 63691 26439 / +91 9884047475 |
| Support | 30 days clarification (post Stage 2 sign-off) |

### AMET University
| Role | Contact |
|------|---------|
| ERP Head | Vineeth, Director e-Governance (director.erp@ametuniv.ac.in) |
| Registrar | Dr. V Sangeetha Albin (registrar@ametuniv.ac.in) |
| Operations | Prem (premanandh@ametuniv.ac.in) |

---

## HANDOVER STATUS TRACKER

| Phase | Activity | Status |
|-------|----------|--------|
| Phase 1 | Documentation package sent | ⏳ Pending |
| Phase 1 | GitHub repo access shared | ⏳ Pending |
| Phase 1 | Stage 1 signature received | ⏳ Pending |
| Phase 2 | KT Day 1 completed | ⏳ Pending |
| Phase 2 | KT Day 2 completed | ⏳ Pending |
| Phase 2 | Credentials transferred | ⏳ Pending |
| Phase 2 | Domain transfer initiated | ⏳ Pending |
| Phase 2 | Stage 2 signature received | ⏳ Pending |
| Phase 3 | Completion Certificate / commercial closure, if applicable under separate process | ⏳ Pending |
| Phase 3 | Videos delivered (14 days) | ⏳ Pending |
| Phase 3 | 30-day support window opened | ⏳ Pending |

---

*ForgeAsh Technologies | connect@forgeash.in | +91 63691 26439*
*AMET Alumni Management Platform | Master Handover Index v1.0 | 28/05/2026*
*Confidential — Academy of Maritime Education and Training*
