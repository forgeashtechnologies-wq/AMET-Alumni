#!/usr/bin/env node
// Keep Supabase project alive by sending periodic lightweight DB requests.
// Supabase pauses free-tier projects after ~7 days of inactivity.
// Run this script every 6 days via cron, GitHub Actions, or Vercel Cron.
//
// Required env vars:
//   SUPABASE_URL                  - e.g. https://gvbtfolcizkzihforqte.supabase.co
//   SUPABASE_ANON_KEY or
//   SUPABASE_SERVICE_ROLE_KEY     - service role key is preferred for keep-alive
//                                   because it bypasses RLS on protected tables
// Optional:
//   KEEPALIVE_TABLE   - table to query (default: alumni_directory_public)
//   KEEPALIVE_REQUESTS - number of requests to send (default: 5)
//
// Usage:
//   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=eyJ... node tools/keep-supabase-active.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = process.env.KEEPALIVE_TABLE || 'profiles';
const REQUEST_COUNT = parseInt(process.env.KEEPALIVE_REQUESTS || '5', 10);

const KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const KEY_TYPE = SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon';

if (!SUPABASE_URL || !KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required.');
  process.exit(1);
}

const baseUrl = SUPABASE_URL.replace(/\/$/, '');

async function pingTable(tableName) {
  const url = `${baseUrl}/rest/v1/${tableName}?select=id&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'apikey': KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.status;
}

async function pingDatabase() {
  // Try the requested table first, then fall back to common tables.
  const tables = [TABLE, 'profiles', 'events', 'jobs', 'connections', 'groups'];
  const seen = new Set();
  let lastError = null;

  for (const tableName of tables) {
    if (seen.has(tableName)) continue;
    seen.add(tableName);
    try {
      return await pingTable(tableName);
    } catch (err) {
      lastError = err;
      // Only continue on 404; other errors (401, 403, etc.) should stop immediately.
      if (!err.message.includes('404')) throw err;
    }
  }

  throw lastError || new Error('No accessible table found');
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting Supabase keep-alive...`);
  console.log(`Project: ${baseUrl}`);
  console.log(`Key type: ${KEY_TYPE}`);
  console.log(`Table: ${TABLE}`);
  console.log(`Requests: ${REQUEST_COUNT}`);

  let failures = 0;

  for (let i = 1; i <= REQUEST_COUNT; i++) {
    try {
      const status = await pingDatabase();
      console.log(`[${i}/${REQUEST_COUNT}] OK - HTTP ${status}`);
    } catch (err) {
      failures++;
      console.error(`[${i}/${REQUEST_COUNT}] FAILED - ${err.message}`);
    }
    // Small delay between requests to avoid rate limiting
    if (i < REQUEST_COUNT) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`[${new Date().toISOString()}] Done. ${REQUEST_COUNT - failures}/${REQUEST_COUNT} pings succeeded.`);

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
