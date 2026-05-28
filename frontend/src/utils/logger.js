/**
 * Centralized Logger Utility
 * 
 * SECURITY: In production, ALL console output is completely disabled.
 * This prevents exposure of sensitive data (UUIDs, emails, tokens, user data)
 * in browser DevTools.
 * 
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.log('message');      // Only in development
 *   logger.error('error');      // Only in development
 *   logger.warn('warning');     // Only in development
 *   logger.info('info');        // Only in development
 *   logger.debug('debug');      // Only in development
 * 
 * For production error tracking, integrate Sentry/LogRocket separately.
 */

const MODE = process.env.NODE_ENV || 'development';
const isProd = MODE === 'production';

// Patterns to redact sensitive data even in development
const REDACT_PATTERNS = [
  /(sb_(publishable|secret)_[A-Za-z0-9_-]+)/gi,                           // Supabase keys
  /(Bearer\s+[A-Za-z0-9-_.]+)/gi,                                         // Authorization headers
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,    // UUIDs
  /[\w.+-]+@[\w.-]+\.[A-Za-z]+/g,                                         // Emails
  /(password|secret|token|key|auth)['":\s]*['"]?[^'",\s}]{4,}/gi,        // Secrets in strings
];

/**
 * Redact sensitive patterns from a value (for dev logging only)
 */
const redact = (x) => {
  if (x === null || x === undefined) return x;
  
  if (typeof x === 'string') {
    return REDACT_PATTERNS.reduce((s, r) => s.replace(r, '[REDACTED]'), x);
  }
  
  if (typeof x === 'object') {
    try {
      const str = JSON.stringify(x, (key, value) => {
        // Redact known sensitive field names
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session'];
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          return '[REDACTED]';
        }
        return value;
      });
      return JSON.parse(
        REDACT_PATTERNS.reduce((s, r) => s.replace(r, '[REDACTED]'), str)
      );
    } catch {
      return '[Object - could not stringify]';
    }
  }
  
  return x;
};

/**
 * No-op function for production
 */
const noop = () => {};

/**
 * Create a dev-only logger function with redaction
 */
const createDevLogger = (method) => (...args) => {
  if (isProd) return; // Double-check: never log in production
  try {
    console[method](...args.map(redact));
  } catch {
    // Silently fail if console is unavailable
  }
};

/**
 * The logger object - completely silent in production
 */
const logger = isProd
  ? {
      log: noop,
      error: noop,
      warn: noop,
      info: noop,
      debug: noop,
      trace: noop,
      table: noop,
      group: noop,
      groupEnd: noop,
      groupCollapsed: noop,
      time: noop,
      timeEnd: noop,
      assert: noop,
      clear: noop,
      count: noop,
      dir: noop,
      dirxml: noop,
    }
  : {
      log: createDevLogger('log'),
      error: createDevLogger('error'),
      warn: createDevLogger('warn'),
      info: createDevLogger('info'),
      debug: createDevLogger('debug'),
      trace: createDevLogger('trace'),
      table: createDevLogger('table'),
      group: createDevLogger('group'),
      groupEnd: createDevLogger('groupEnd'),
      groupCollapsed: createDevLogger('groupCollapsed'),
      time: createDevLogger('time'),
      timeEnd: createDevLogger('timeEnd'),
      assert: createDevLogger('assert'),
      clear: createDevLogger('clear'),
      count: createDevLogger('count'),
      dir: createDevLogger('dir'),
      dirxml: createDevLogger('dirxml'),
    };

// Expose logger on window for any accidental global usages
try {
  if (typeof window !== 'undefined' && !window.logger) {
    window.logger = logger;
  }
} catch (_) {
  // ignore if window is not writable
}

export default logger;

/**
 * Override window.console in production as defense-in-depth
 * This catches any console.* calls that weren't replaced with logger.*
 * 
 * Call this once at app initialization (e.g., in index.js)
 */
export const lockdownConsoleInProduction = () => {
  if (!isProd) return;
  
  if (typeof window !== 'undefined' && window.console) {
    const methods = [
      'log', 'error', 'warn', 'info', 'debug', 'trace',
      'table', 'group', 'groupEnd', 'groupCollapsed',
      'time', 'timeEnd', 'assert', 'clear', 'count', 'dir', 'dirxml'
    ];
    
    methods.forEach(method => {
      try {
        window.console[method] = noop;
      } catch {
        // Some browsers may not allow overriding console methods
      }
    });
  }
};
