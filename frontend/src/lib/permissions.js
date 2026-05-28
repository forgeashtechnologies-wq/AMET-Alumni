// Centralized permissions for Groups, aligned with new rules
// Usage: import { PERMISSIONS, can } from '@/lib/permissions';

export const PERMISSIONS = {
  super_admin: {
    'groups:create': true,  'groups:approve': true,
    'mentorship:request': true, 'mentorship:accept': true, 'mentorship:availability:update': true,
    'mentors:approve': true, 'mentors:reject': true,
  },
  admin: {
    'groups:create': true,  'groups:approve': true,
    'mentorship:request': true, 'mentorship:accept': true, 'mentorship:availability:update': true,
    'mentors:approve': true, 'mentors:reject': true,
  },
  alumni: {
    'groups:create': true,  'groups:approve': false,
    'mentorship:request': true,
  },
  employer: {
    'groups:create': false, 'groups:approve': false,
  },
  student: {
    'groups:create': false, 'groups:approve': false,
    'mentorship:request': true,
  },
};

export const can = (perm, role, map = PERMISSIONS) => !!(map?.[role]?.[perm]);
