export type AppRole = 'alumni' | 'student' | 'employer' | 'admin' | 'super_admin';

export const ROLE_LABELS: Record<AppRole, string> = {
  alumni: 'Alumni',
  student: 'Student',
  employer: 'Employer',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ROLE_OPTIONS: Array<{ label: string; value: AppRole }> = [
  { label: 'Alumni', value: 'alumni' },
  { label: 'Student', value: 'student' },
  { label: 'Employer', value: 'employer' },
  { label: 'Admin', value: 'admin' },
  { label: 'Super Admin', value: 'super_admin' },
];

export const isAdminLike = (r?: AppRole | null) => r === 'admin' || r === 'super_admin';

export const isRole = (v: any): v is AppRole =>
  typeof v === 'string' &&
  ['alumni', 'student', 'employer', 'admin', 'super_admin'].includes(v);
