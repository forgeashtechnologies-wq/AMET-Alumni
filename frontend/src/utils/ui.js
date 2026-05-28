import logger from './logger';
/**
 * UI Utility Functions
 * Helpers for avatar rendering, cache-busting, cooldowns, etc.
 */

/**
 * Extract initials from a full name
 * @param {string} fullName - Full name (e.g., "Ashwin Kumar")
 * @returns {string} - Two-letter initials (e.g., "AK")
 */
export function getInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '?';
  
  const trimmed = fullName.trim();
  if (!trimmed) return '?';
  
  const parts = trimmed.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    // Single name: take first two characters
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  // Multiple names: first letter of first and last name
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

/**
 * Add cache-buster to URL
 * @param {string} url - Original URL
 * @param {string|number} version - Version/timestamp
 * @returns {string} - URL with cache-buster parameter
 */
export function getCacheBustedUrl(url, version) {
  if (!url) return '';
  if (!version) return url;
  
  try {
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set('v', String(version));
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, append manually
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }
}

/**
 * Get disconnect cooldown end time from localStorage
 * @param {string} peerId - Other user's ID
 * @returns {number|null} - Timestamp when cooldown ends, or null if no cooldown
 */
export function getDisconnectCooldown(peerId) {
  if (!peerId) return null;
  
  try {
    const key = `disconnect_cooldown_${peerId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const cooldownEnd = parseInt(stored, 10);
    if (isNaN(cooldownEnd)) return null;
    
    // If cooldown has expired, remove it
    if (Date.now() >= cooldownEnd) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cooldownEnd;
  } catch (e) {
    logger.warn('Error reading disconnect cooldown:', e);
    return null;
  }
}

/**
 * Set disconnect cooldown (24 hours from now)
 * @param {string} peerId - Other user's ID
 */
export function setDisconnectCooldown(peerId) {
  if (!peerId) return;
  
  try {
    const key = `disconnect_cooldown_${peerId}`;
    const cooldownEnd = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem(key, String(cooldownEnd));
  } catch (e) {
    logger.warn('Error setting disconnect cooldown:', e);
  }
}

/**
 * Clear disconnect cooldown
 * @param {string} peerId - Other user's ID
 */
export function clearDisconnectCooldown(peerId) {
  if (!peerId) return;
  
  try {
    const key = `disconnect_cooldown_${peerId}`;
    localStorage.removeItem(key);
  } catch (e) {
    logger.warn('Error clearing disconnect cooldown:', e);
  }
}

/**
 * Format cooldown time remaining
 * @param {number} cooldownEnd - Timestamp when cooldown ends
 * @returns {string} - Formatted time (e.g., "23h 45m")
 */
export function formatCooldownTime(cooldownEnd) {
  if (!cooldownEnd) return '';
  
  const now = Date.now();
  const remaining = cooldownEnd - now;
  
  if (remaining <= 0) return '';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get role badge color
 * @param {string} role - User role
 * @returns {string} - Tailwind color class
 */
export function getRoleBadgeColor(role) {
  const roleMap = {
    student: 'bg-blue-500',
    alumni: 'bg-green-500',
    employer: 'bg-amber-500',
    mentor: 'bg-purple-500',
    admin: 'bg-red-500',
  };
  
  return roleMap[role?.toLowerCase()] || 'bg-gray-500';
}

/**
 * Get size classes for avatar
 * @param {number} size - Size in pixels (24, 32, 40, 64, 96)
 * @returns {object} - Classes for container and text
 */
export function getAvatarSizeClasses(size) {
  const sizeMap = {
    24: { container: 'w-6 h-6', text: 'text-xs' },
    32: { container: 'w-8 h-8', text: 'text-sm' },
    40: { container: 'w-10 h-10', text: 'text-base' },
    80: { container: 'w-20 h-20', text: 'text-2xl' },
    100: { container: 'w-[100px] h-[100px]', text: 'text-3xl' },
    120: { container: 'w-[120px] h-[120px]', text: 'text-4xl' },
    140: { container: 'w-[140px] h-[140px]', text: 'text-5xl' },
    64: { container: 'w-16 h-16', text: 'text-2xl' },
    96: { container: 'w-24 h-24', text: 'text-4xl' },
  };
  
  return sizeMap[size] || sizeMap[40];
}

/**
 * Get rounded classes
 * @param {string} rounded - Rounded style ('full', 'xl', 'md')
 * @param {boolean} square - If true, override to 'md'
 * @returns {string} - Tailwind rounded class
 */
export function getRoundedClass(rounded, square) {
  if (square) return 'rounded-md';
  
  const roundedMap = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    md: 'rounded-md',
  };
  
  return roundedMap[rounded] || 'rounded-full';
}
