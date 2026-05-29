# Environment Variables — AMET Alumni Management Platform

## Frontend Variables (Vercel)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |

## Supabase Edge Function Secrets

| Secret | Description | Where to Set |
|--------|-------------|--------------|
| `AI_PROVIDER_API_KEY` | Optional AI provider for mentor matching, if enabled by AMET | Supabase Dashboard → Edge Functions → Secrets (if AI provider is configured) |
| `EMAIL_PROVIDER_API_KEY` | Email provider configuration, if enabled by AMET | Supabase Dashboard → Edge Functions → Secrets (if email provider is configured) |

## Setting Environment Variables

### In Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development

### In Supabase Edge Functions:
```bash
supabase secrets set AI_PROVIDER_API_KEY=your_key_here (if AI provider is configured)
supabase secrets set EMAIL_PROVIDER_API_KEY=your_key_here (if email provider is configured)
```

## IMPORTANT SECURITY NOTES
- NEVER commit .env files to the repository
- NEVER share the service_role key (admin key) — only use the anon key in frontend
- Rotate all keys after handover as a security best practice
- The anon key is safe for frontend use (RLS enforces security at database level)
