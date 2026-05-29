# Environment Variables — AMET Alumni Management Platform

## Frontend Variables (Vercel)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `REACT_APP_SUPABASE_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |

## Optional Provider Secrets

The following provider secrets are not required for the standard handover unless AMET separately chooses to enable the related optional integrations.

| Secret | Purpose | Required at Handover? | Where to Set |
|--------|---------|----------------------|--------------|
| `AI_PROVIDER_API_KEY` | Optional provider for mentor matching workflows, if enabled later | No | Supabase Dashboard → Edge Functions → Secrets |
| `EMAIL_PROVIDER_API_KEY` | Optional email provider configuration, if enabled later | No | Supabase Dashboard → Edge Functions → Secrets |

## Setting Environment Variables

### In Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development

### In Supabase Edge Functions (Optional only if AMET enables the related provider):
```bash
# Optional only if AMET enables the related provider
supabase secrets set AI_PROVIDER_API_KEY=your_key_here
supabase secrets set EMAIL_PROVIDER_API_KEY=your_key_here
```

## IMPORTANT SECURITY NOTES
- NEVER commit .env files to the repository
- NEVER share the service_role key (admin key) — only use the anon key in frontend
- Rotate all keys after handover as a security best practice
- The anon key is safe for frontend use (RLS enforces security at database level)
