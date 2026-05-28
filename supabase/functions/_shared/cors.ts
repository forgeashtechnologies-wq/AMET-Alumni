// CORS headers for Supabase Edge Functions
// This file provides shared CORS headers to be used across all Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, consider restricting this to specific origins
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper function to handle OPTIONS requests for CORS preflight
 * @returns Response with CORS headers
 */
export function handleOptionsRequest() {
  return new Response(null, {
    status: 204, // No content
    headers: corsHeaders,
  });
}

/**
 * Helper function to add CORS headers to any response
 * @param response The original Response object
 * @returns Response with CORS headers added
 */
export function addCorsHeaders(response: Response): Response {
  // Create a new headers object with all original headers
  const newHeaders = new Headers(response.headers);
  
  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  // Create a new response with the same body, status, and updated headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
