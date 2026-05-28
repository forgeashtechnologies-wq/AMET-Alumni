# Environment Variables — AMET Alumni Portal

## Frontend Variables (Vercel)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |

## Supabase Edge Function Secrets

| Secret | Description | Where to Set |
|--------|-------------|--------------|
| `GROQ_API_KEY` | Groq API for mentor matching AI | Supabase Dashboard → Edge Functions → Secrets |
| `SENDGRID_API_KEY` | SendGrid for email notifications | Supabase Dashboard → Edge Functions → Secrets |

## Setting Environment Variables

### In Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development

### In Supabase Edge Functions:
```bash
supabase secrets set GROQ_API_KEY=your_key_here
supabase secrets set SENDGRID_API_KEY=your_key_here
```

## IMPORTANT SECURITY NOTES
- NEVER commit .env files to the repository
- NEVER share the service_role key (admin key) — only use the anon key in frontend
- Rotate all keys after handover as a security best practice
- The anon key is safe for frontend use (RLS enforces security at database level)
