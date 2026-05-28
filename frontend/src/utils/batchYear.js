/**
 * Centralized utility for batch/graduation year logic
 * Ensures consistent handling across registration, profile editing, and display
 */

/**
 * Determines which profile columns to write based on user role and year value
 * @param {string} role - User role: 'alumni', 'student', 'employer', 'admin'
 * @param {number|null} year - The year value to write
 * @returns {Object} Object with column names as keys and values to write
 */
export function getProfileYearWriteFields(role, year) {
  const yearValue = year ? parseInt(year, 10) : null;
  const isValidYear = yearValue && !isNaN(yearValue);

  // Alumni: write to graduation_year
  if (role === 'alumni') {
    return {
      graduation_year: isValidYear ? yearValue : null,
      expected_graduation_year: null, // Clear student field
    };
  }

  // Student/Mentee: write to expected_graduation_year
  if (role === 'student' || role === 'mentee') {
    return {
      graduation_year: null, // Clear alumni field
      expected_graduation_year: isValidYear ? yearValue : null,
    };
  }

  // Employer/Admin: prefer graduation_year but allow either
  // Don't clear the other field in case they switch roles
  if (role === 'employer' || role === 'admin') {
    return {
      graduation_year: isValidYear ? yearValue : null,
      // Keep expected_graduation_year as-is for admins
    };
  }

  // Default: write to graduation_year
  return {
    graduation_year: isValidYear ? yearValue : null,
  };
}

/**
 * Extracts the effective batch/graduation year from a profile object
 * Uses COALESCE logic matching the backend view
 * @param {Object} profile - Profile object with year fields
 * @returns {number|null} The effective year or null
 */
export function getEffectiveBatchYear(profile) {
  if (!profile) return null;

  const normalizeYear = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(n) ? n : null;
  };

  return (
    normalizeYear(profile.graduation_year) ??
    normalizeYear(profile.expected_graduation_year) ??
    normalizeYear(profile.batch_year) ??
    null
  );
}

/**
 * Formats a batch year for display
 * @param {number|null} year - The year to format
 * @param {string} fallback - Fallback text if year is null (default: 'Batch not specified')
 * @returns {string} Formatted batch label
 */
export function formatBatchLabel(year, fallback = 'Year of completion not specified') {
  return year ? `Year of completion ${year}` : fallback;
}

/**
 * Validates a batch/graduation year value
 * @param {number|string} year - Year to validate
 * @param {string} role - User role for context
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateBatchYear(year, role) {
  if (!year || year === '') {
    // Required for alumni and students
    if (role === 'alumni' || role === 'student' || role === 'mentee') {
      return {
        isValid: false,
        error: role === 'alumni' 
          ? 'Graduation year is required for alumni'
          : 'Expected graduation year is required for students',
      };
    }
    // Optional for others
    return { isValid: true, error: null };
  }

  const yearNum = parseInt(year, 10);
  
  if (isNaN(yearNum)) {
    return { isValid: false, error: 'Please enter a valid year' };
  }

  const currentYear = new Date().getFullYear();
  const minYear = 1970;
  const maxYear = currentYear + 6; // Allow future years for students

  if (yearNum < minYear || yearNum > maxYear) {
    return {
      isValid: false,
      error: `Year must be between ${minYear} and ${maxYear}`,
    };
  }

  // Alumni should have past or current year
  if (role === 'alumni' && yearNum > currentYear) {
    return {
      isValid: false,
      error: 'Graduation year cannot be in the future for alumni',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Gets the appropriate field label based on role
 * @param {string} role - User role
 * @returns {string} Label for the year field
 */
export function getBatchYearLabel(role) {
  if (role === 'student' || role === 'mentee') {
    return 'Expected Graduation Year';
  }
  if (role === 'alumni') {
    return 'Graduation Year';
  }
  return 'Batch / Graduation Year';
}

/**
 * Gets the appropriate placeholder text based on role
 * @param {string} role - User role
 * @returns {string} Placeholder text
 */
export function getBatchYearPlaceholder(role) {
  const currentYear = new Date().getFullYear();
  
  if (role === 'student' || role === 'mentee') {
    return `e.g., ${currentYear + 1}`;
  }
  if (role === 'alumni') {
    return `e.g., ${currentYear - 2}`;
  }
  return `e.g., ${currentYear}`;
}

/**
 * Generates year options for a dropdown based on role
 * @param {string} role - User role
 * @returns {Array<{value: number, label: string}>} Array of year options
 */
export function generateYearOptions(role) {
  const currentYear = new Date().getFullYear();
  const minYear = 1970;
  const maxYear = role === 'student' || role === 'mentee' 
    ? currentYear + 6 
    : currentYear;
  
  const options = [];
  
  // Generate in descending order (most recent first)
  for (let year = maxYear; year >= minYear; year--) {
    options.push({
      value: year,
      label: year.toString(),
    });
  }
  
  return options;
}
