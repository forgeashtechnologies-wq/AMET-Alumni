/**
 * Safely formats a date string or timestamp to a localized date string
 * @param {string|Date} date - The date to format (can be string, Date, null, or undefined)
 * @param {Object} options - Options for toLocaleDateString
 * @returns {string} Formatted date string or 'N/A' if invalid
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  const defaultOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return dateObj.toLocaleString(undefined, { ...defaultOptions, ...options });
};

/**
 * Formats a date to a simple date string (without time)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string or 'N/A' if invalid
 */
export const formatDateOnly = (date) => {
  return formatDate(date, { 
    hour: undefined, 
    minute: undefined, 
    hour12: false 
  });
};

/**
 * Formats a date to a time string (without date)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted time string or 'N/A' if invalid
 */
export const formatTimeOnly = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
