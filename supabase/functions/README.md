# Supabase Edge Functions

## Admin Delete User Function

The `admin-delete-user` function securely deletes users from Auth and related data. It requires:

1. User making the request must have admin/super_admin role in profiles table
2. Only super_admins can delete other admins/super_admins

### Deployment

```bash
# Deploy the function to Supabase
cd /Users/ashwin/CascadeProjects/AMETNEW/AMETNEWSUPABASE/supabase/functions
supabase functions deploy admin-delete-user

# Set required secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJh...your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJh...your-service-role-key
```

The service role key is **required** to delete Auth users via the Admin API.

Alternatively, set secrets through the Supabase Dashboard:
1. Go to Project Settings → Functions → Secrets
2. Add the three required environment variables

### Testing

After deployment, you should be able to:
1. Log in as an admin user
2. Delete a standard user from the Admin panel
3. View logs in the Supabase Dashboard → Functions → Logs

### Troubleshooting

If you encounter errors:

- **CORS error**: Check that your local dev URL is in the ALLOWED_ORIGINS
- **"Auth delete failed"**: Verify your SUPABASE_SERVICE_ROLE_KEY is correct
- **"Unauthorized"**: User making request is not logged in
- **"Forbidden"**: User does not have admin/super_admin role
