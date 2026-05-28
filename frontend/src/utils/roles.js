// Single source of truth for app roles (JS runtime version)
// If you migrate the app to TypeScript fully, you can use roles.ts; this JS file exists for bundlers not configured for TS.

/** @typedef {'alumni'|'student'|'employer'|'admin'|'super_admin'} AppRole */

/** @type {Record<AppRole, string>} */
export const ROLE_LABELS = {
  alumni: 'Alumni',
  student: 'Student',
  employer: 'Employer',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

/** @type {Array<{label:string, value:AppRole}>} */
export const ROLE_OPTIONS = [
  { label: 'Alumni', value: 'alumni' },
  { label: 'Student', value: 'student' },
  { label: 'Employer', value: 'employer' },
  { label: 'Admin', value: 'admin' },
  { label: 'Super Admin', value: 'super_admin' },
];

/**
 * @param {AppRole | null | undefined} r
 */
export const isAdminLike = (r) => r === 'admin' || r === 'super_admin';

/**
 * Explicit helpers to match consumer code expectations
 */
export const isAdmin = (role) => role === 'admin' || role === 'super_admin';
export const isEmployer = (role) => role === 'employer';

/**
 * Runtime guard to validate role enum values before sending to RPC
 * @param {any} v
 * @returns {v is AppRole}
 */
export const isRole = (v) =>
  typeof v === 'string' &&
  ['alumni', 'student', 'employer', 'admin', 'super_admin'].includes(v);
