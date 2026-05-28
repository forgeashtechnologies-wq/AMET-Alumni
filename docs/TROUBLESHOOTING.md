# Troubleshooting Guide — AMET Alumni Portal

## Common Issues & Fixes

### 1. App won't load / blank screen
**Cause:** Missing environment variables in Vercel
**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify `REACT_APP_SUPABASE_URL` is set
3. Verify `REACT_APP_SUPABASE_ANON_KEY` is set
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
**Cause:** SendGrid API key expired or limit reached
**Fix:**
1. Check SendGrid dashboard for account status
2. Free tier: 100 emails/day limit
3. Update secret: `supabase secrets set SENDGRID_API_KEY=new_key` 
4. Redeploy edge function: `supabase functions deploy send-feedback-notification` 

---

### 4. Mentor matching not working
**Cause:** Groq API key expired
**Fix:**
1. Get new key from: https://console.groq.com
2. Update: `supabase secrets set GROQ_API_KEY=new_key` 
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

## Emergency Contacts
- **ForgeAsh Technologies:** connect@forgeash.in | +91 63691 26439
- **Supabase Support:** support@supabase.com
- **Vercel Support:** https://vercel.com/support
