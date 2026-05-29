# Troubleshooting Guide — AMET Alumni Management Platform

## Common Issues & Fixes

### 1. App won't load / blank screen
**Cause:** Missing environment variables in Vercel
**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify `REACT_APP_SUPABASE_URL` is set
3. Verify `REACT_APP_SUPABASE_KEY` is set
4. Redeploy: Vercel Dashboard → Deployments → Redeploy

---

### 2. Login not working
**Cause:** Supabase auth misconfiguration
**Fix:**
1. Check Supabase Dashboard → Authentication → Settings
2. Verify your domain is in "Redirect URLs"
3. Check Supabase status: https://status.supabase.com

---

### 3. Emails not sending
**Cause:** Email provider configuration issue or limit reached
**Fix:**
1. Check your configured email provider dashboard for account status
2. Verify email service tier and daily limits
3. Update secret: `supabase secrets set EMAIL_PROVIDER_API_KEY=new_key` (if email provider is configured) 
4. Redeploy edge function: `supabase functions deploy send-feedback-notification` 

---

### 4. Mentor matching not working
**Cause:** Optional AI provider API key expired (if AI matching is enabled)
**Fix:**
1. If AI matching is enabled, get new key from your configured AI provider
2. Update: `supabase secrets set AI_PROVIDER_API_KEY=new_key` (if AI provider is configured) 
3. Redeploy: `supabase functions deploy mentor-matching` 

---

### 5. Deployment fails on Vercel
**Cause:** Build error
**Fix:**
1. Go to Vercel → Deployments → Click failed deployment
2. Read the build log
3. Common fix: `CI=false react-scripts build` (already set in vercel.json)
4. Check for missing dependencies in package.json

---

### 6. User can't access features after approval
**Cause:** RLS policy cache
**Fix:**
1. Ask user to log out and log back in
2. JWT refreshes on new login
3. If still failing, check Supabase → Authentication → Users → verify role

---

### 7. Database connection errors
**Cause:** Supabase project paused (free tier pauses after inactivity)
**Fix:**
1. Go to Supabase Dashboard
2. Click "Restore project" if paused
3. Consider upgrading to Pro tier for production

---

## Reference Contacts

- **Official support and documentation communication:** [connect@forgeash.in](mailto:connect@forgeash.in)
- **Note:** Phone may be used for scheduling or coordination only. Production incident management, bug fixes, infrastructure changes, and new development are outside the standard clarification support scope unless separately agreed.
- **Supabase Support:** support@supabase.com
- **Vercel Support:** https://vercel.com/support
