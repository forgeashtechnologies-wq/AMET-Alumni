import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.json();
    const { 
      host, 
      port = 587, 
      username, 
      password, 
      from_email, 
      from_name,
      use_tls = true 
    } = body;

    if (!host || !username || !password || !from_email) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: host, username, password, from_email' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test SMTP connection
    const testResult = await testSmtpConnection({
      host,
      port,
      username,
      password,
      use_tls
    });

    if (!testResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'SMTP connection failed: ' + testResult.error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Save SMTP settings
    const { data, error } = await supabase
      .from('smtp_settings')
      .upsert({
        host,
        port,
        username,
        password_encrypted: password, // In production, encrypt this
        from_email,
        from_name: from_name || 'AMET Platform',
        use_tls,
        is_active: true
      })
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMTP settings saved successfully',
        settings: data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('SMTP config error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Test SMTP connection
async function testSmtpConnection(config) {
  try {
    // Basic SMTP connection test
    const response = await fetch(`https://${config.host}:${config.port}`, {
      method: 'CONNECT',
      headers: {
        'Host': config.host,
        'User-Agent': 'SMTP-Test/1.0'
      },
      // Note: This is a simplified test
      // In production, you'd use proper SMTP library
    });

    // For now, we'll just validate the config format
    if (!config.host.includes('.') || config.port < 1 || config.port > 65535) {
      return { success: false, error: 'Invalid host or port' };
    }

    if (!config.username || !config.password) {
      return { success: false, error: 'Missing credentials' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
