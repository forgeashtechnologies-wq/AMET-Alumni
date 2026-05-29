# Deployment Guide — AMET Alumni Management Platform

## Frontend (Vercel)

### Initial Setup
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import: `forgeashtechnologies-wq/AMET-Alumni` 
4. Set these build settings:
   - Framework: Create React App
   - Root Directory: `frontend` 
   - Build Command: `CI=false react-scripts build` 
   - Output Directory: `build` 

### Environment Variables in Vercel
Add these in Vercel → Settings → Environment Variables:
```
REACT_APP_SUPABASE_URL = https://your-project-ref.supabase.co
REACT_APP_SUPABASE_KEY = [get from Supabase dashboard]
```

### Deploying Updates
- Every push to `main` branch auto-deploys
- Manual deploy: Vercel Dashboard → Deployments → Redeploy

---

## Backend (Supabase)

### Access
1. Go to: https://supabase.com/dashboard
2. Project ID: your-project-ref
3. Navigate to your project

### Running Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run pending migrations
supabase migration up
```

### Edge Functions
Three edge function entries are documented for handover reference:
- `event-reminders` — Event reminder / email notification workflow, subject to provider configuration if enabled by AMET
- `mentor-matching` — Mentor matching workflow; optional provider configuration only if AMET enables it later
- `send-feedback-notification` — Feedback notification workflow, subject to provider configuration if enabled by AMET

To redeploy an edge function:
```bash
supabase functions deploy event-reminders
supabase functions deploy mentor-matching
supabase functions deploy send-feedback-notification
```

---

## Post-Deployment Checklist
- [ ] Verify Vercel environment variables are set
- [ ] Test login as Super Admin
- [ ] Test login as Alumni
- [ ] Verify notification workflows according to AMET's enabled provider configuration
- [ ] Check Supabase logs for errors
- [ ] Verify all edge functions are active

---

## Domain Configuration
- Configure custom domain in Vercel → Settings → Domains
- Update CORS settings in Supabase if domain changes
