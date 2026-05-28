# Deployment Guide — AMET Alumni Portal

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
REACT_APP_SUPABASE_ANON_KEY = [get from Supabase dashboard]
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
Three functions are deployed and active:
- `event-reminders` — Email reminders for events
- `mentor-matching` — AI-powered mentor matching
- `send-feedback-notification` — Feedback email notifications

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
- [ ] Verify email notifications working
- [ ] Check Supabase logs for errors
- [ ] Verify all edge functions are active

---

## Domain Configuration
- Configure custom domain in Vercel → Settings → Domains
- Update CORS settings in Supabase if domain changes
