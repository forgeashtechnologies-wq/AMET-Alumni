// Deno Edge Function: set-role
// Securely set the authenticated user's role to alumni|student|employer
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Exposed at: /functions/v1/set-role

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptionsRequest, addCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("set-role: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const ALLOWED_ROLES = new Set(["alumni", "student", "employer"]);

serve(async (req) => {
  try {
    // CORS preflight: respond 200 OK with CORS headers
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    // Validate Authorization header (user JWT)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const jwt = authHeader.split(" ")[1];

    // Validate body
    let body: any = null;
    try {
      body = await req.json();
    } catch (_) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    const role = (body?.role || "").toString().trim();
    if (!ALLOWED_ROLES.has(role)) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    // Verify user from JWT
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    const userId = userData.user.id;

    // Call secure RPC to set role (enforced by trigger and backend function)
    const { error: rpcErr } = await supabaseAdmin.rpc("admin_set_user_role", {
      user_id: userId,
      role,
    });

    if (rpcErr) {
      console.error("set-role rpc error:", rpcErr);
      const status = rpcErr?.code === "42501" || rpcErr?.code === "P0001" ? 403 : 400;
      return addCorsHeaders(
        new Response(JSON.stringify({ error: rpcErr.message || "Failed to set role" }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    return addCorsHeaders(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch (e) {
    console.error("set-role unexpected error:", e);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
});
