import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheckIcon, KeyIcon } from '@heroicons/react/24/outline';

/**
 * PermissionsManagement - Allows super admins to manage role permissions
 */
const PermissionsManagement = () => {
  const { getUserRole } = useAuth();
  const isSuperAdmin = getUserRole() === 'super_admin';

  // Legacy UI removed; no operations here while backend migrates to enum-based permissions.

  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 p-8 rounded-lg shadow-md text-center">
        <div className="text-red-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800">Super Admin Access Required</h3>
        <p className="mt-2 text-sm text-red-700">
          You need Super Admin privileges to manage permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <KeyIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-900">Permission Management</h3>
            <p className="text-sm text-blue-700 mt-1">
              This module is temporarily disabled while we migrate to enum-based roles sourced from <code>public.profiles.role</code>.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              The legacy <code>public.roles</code>-driven permissions UI has been removed from the frontend to enforce a single source of truth.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-6 w-6 text-yellow-600 mr-2" />
          <div>
            <h4 className="text-yellow-900 font-medium">Admin Note</h4>
            <p className="text-sm text-yellow-800 mt-1">
              To re-enable granular permissions by role, migrate backend permissions to reference the enum roles directly, or provide an RPC layer that maps enum roles to permission sets. Once ready, we can wire this UI to that new API without querying <code>public.roles</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsManagement;
