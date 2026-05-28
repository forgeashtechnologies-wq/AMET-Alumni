/**
 * @fileoverview Text sanitization utilities for security
 * Prevents XSS and other injection attacks
 */

/**
 * Escapes HTML entities to prevent XSS
 * @param {string} text - Raw text to escape
 * @returns {string} Escaped text safe for HTML rendering
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return text.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char]);
}

/**
 * Strips HTML tags from text
 * @param {string} html - HTML string to strip
 * @returns {string} Plain text without HTML tags
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  
  // Remove script tags and their content first
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags and their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  text = textarea.value;
  
  return text.trim();
}

/**
 * Sanitizes text for safe display (removes dangerous patterns)
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  let sanitized = text;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs (potential XSS vector)
  sanitized = sanitized.replace(/data:/gi, '');
  
  // Remove vbscript: URLs
  sanitized = sanitized.replace(/vbscript:/gi, '');
  
  return sanitized.trim();
}

/**
 * Validates and sanitizes a URL
 * @param {string} url - URL to validate
 * @param {string[]} allowedSchemes - Allowed URL schemes
 * @returns {{ valid: boolean, url: string, error?: string }}
 */
export function sanitizeUrl(url, allowedSchemes = ['http', 'https', 'mailto']) {
  if (!url || typeof url !== 'string') {
    return { valid: true, url: '' }; // Empty is valid
  }
  
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: true, url: '' };
  }
  
  // Check for dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const scheme of dangerousSchemes) {
    if (trimmed.toLowerCase().startsWith(scheme)) {
      return { valid: false, url: '', error: `URLs starting with ${scheme} are not allowed` };
    }
  }
  
  // Validate scheme
  const schemeMatch = trimmed.match(/^(\w+):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (!allowedSchemes.includes(scheme)) {
      return { 
        valid: false, 
        url: '', 
        error: `Only ${allowedSchemes.join(', ')} URLs are allowed` 
      };
    }
  } else {
    // No scheme - assume https
    return { valid: true, url: `https://${trimmed}` };
  }
  
  return { valid: true, url: trimmed };
}

/**
 * Sanitizes job description for safe rendering
 * Allows basic formatting but removes dangerous content
 * @param {string} description - Job description HTML/text
 * @returns {string} Sanitized description
 */
export function sanitizeJobDescription(description) {
  if (!description || typeof description !== 'string') return '';
  
  let sanitized = description;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Remove data: URLs from src attributes
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*\/?>/gi, '');
  
  return sanitized.trim();
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 200) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  
  // Try to break at a word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Sanitizes user input for search queries
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  
  // Remove special characters that could be used for SQL injection
  // (Note: Supabase uses parameterized queries, but this is defense in depth)
  let sanitized = query.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 200);
  }
  
  return sanitized;
}

export default {
  escapeHtml,
  stripHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeJobDescription,
  truncateText,
  sanitizeSearchQuery,
};
