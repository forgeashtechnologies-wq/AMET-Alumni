import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Converts a UTC date string to a formatted string in the IST timezone.
 * @param {string | Date} date - The UTC date to convert.
 * @param {string} formatStr - The desired output format.
 * @returns {string} The formatted date string in IST.
 */
export const formatInIST = (date, formatStr = 'h:mm a') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(utcToZonedTime(dateObj, IST_TIMEZONE), formatStr, { timeZone: IST_TIMEZONE });
};

/**
 * Merges a local date object and a local time object into a single UTC ISO string.
 * This is for forms where date and time are picked separately.
 * @param {Date} datePart - The date object from a date picker.
 * @param {Date} timePart - The time object from a time picker.
 * @returns {string | null} The full UTC ISO string or null if inputs are invalid.
 */
/**
 * Merges a local date object and a local time object into a single UTC ISO string.
 * This is for forms where date and time are picked separately.
 * @param {Date} datePart - The date object from a date picker.
 * @param {Date} timePart - The time object from a time picker.
 * @returns {string | null} The full UTC ISO string or null if inputs are invalid.
 */
export const mergeAndConvertToUTC = (datePart, timePart) => {
  if (!datePart || !timePart) return null;

  // Create a new Date object from the date part to avoid mutating the original state
  const mergedDate = new Date(datePart);
  
  // Set the time from the time part
  mergedDate.setHours(timePart.getHours());
  mergedDate.setMinutes(timePart.getMinutes());
  mergedDate.setSeconds(timePart.getSeconds());
  mergedDate.setMilliseconds(timePart.getMilliseconds());

  // The 'mergedDate' is now a local date object in the browser's timezone (IST).
  // We need to tell date-fns-tz that this local time should be treated as 'Asia/Kolkata'
  // and then converted to UTC.
  const utcDate = zonedTimeToUtc(mergedDate, IST_TIMEZONE);
  
  // Return the date in ISO 8601 format (e.g., "2025-07-23T09:30:00.000Z")
  return utcDate.toISOString();
};

/**
 * Converts a date string and time string to a UTC date by first treating them as IST.
 * @param {string} dateStr - The date string in format 'YYYY-MM-DD'.
 * @param {string} timeStr - The time string in format 'HH:MM' or 'H:MM'.
 * @returns {Date} The UTC date object.
 */
export const convertToUTCFromIST = (dateStr, timeStr) => {
  const [hoursStr, minutesStr] = timeStr.split(':');
  const dateTimeStr = `${dateStr}T${hoursStr.padStart(2, '0')}:${minutesStr.padStart(2, '0')}:00`;
  const dateInIST = new Date(dateTimeStr);
  return zonedTimeToUtc(dateInIST, IST_TIMEZONE); // Converts to UTC
};

/**
 * Formats a UTC date string as IST with the specified format.
 * @param {string} utcDateStr - The UTC date string.
 * @param {string} formatStr - The desired format string.
 * @returns {string} The formatted date string in IST.
 */
export const displayIST = (utcDateStr, formatStr = 'h:mm a') => {
  const istDate = utcToZonedTime(new Date(utcDateStr), IST_TIMEZONE);
  return format(istDate, formatStr);
};
