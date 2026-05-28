// Deno Edge Function: admin-invite-user
// Securely invite a user via Supabase Admin API. Requires service role key.
// Set env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_ORIGIN
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PUBLIC_ORIGIN = Deno.env.get("PUBLIC_ORIGIN") || "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env for admin-invite-user function");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
});

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    // Optional: restrict by bearer token or referer allowlist if desired

    const { email, user_metadata } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${PUBLIC_ORIGIN}/auth/callback`,
      data: user_metadata || {},
    });
    if (error) {
      console.error("inviteUserByEmail error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-invite-user error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
