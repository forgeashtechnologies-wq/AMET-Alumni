import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PermissionGate from '../PermissionGate';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  BriefcaseIcon,
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

/**
 * AdminActions - A component that displays different administrative actions
 * based on the user's permissions in the RBAC system
 */
const AdminActions = () => {
  const { profile, getUserRole } = useAuth();
  const userRole = getUserRole();

  return (
    <div className="glass-card rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Administrative Actions</h2>
        <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
            <span className="text-sm font-semibold text-blue-700">
              {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
            </span>
          </div>
          <div className="text-sm">
            <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
            <div className="flex items-center">
              <span className={`text-xs ${userRole === 'super_admin' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{userRole}</span>
              {userRole === 'super_admin' && 
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <ShieldCheckIcon className="w-3 h-3 mr-0.5" />
                  Super Admin
                </span>
              }
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Event Management Section */}
        <PermissionGate 
          permissions={['events:create', 'access:all']} 
          fallback={<div className="hidden"></div>}
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 shadow-sm border border-blue-200 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-16 h-16 -mt-4 -mr-4 bg-blue-200 opacity-30 rounded-full"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mb-4">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Event Management</h3>
              
              <div className="flex flex-wrap gap-2">
                <PermissionGate permissions={['events:create', 'access:all']}>
                  <Link to="/events/create" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-blue-700 shadow-sm hover:shadow-md border border-blue-200 transition-all">
                    <PlusIcon className="h-3.5 w-3.5 mr-1" />
                    Create Event
                  </Link>
                </PermissionGate>
              </div>
            </div>
          </div>
        </PermissionGate>
        
        {/* Job Management Section */}
        <PermissionGate 
          permissions={['manage_jobs', 'create_jobs', 'edit_jobs']} 
          fallback={<div className="hidden"></div>}
        >
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 shadow-sm border border-green-200 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-16 h-16 -mt-4 -mr-4 bg-green-200 opacity-30 rounded-full"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center mb-4">
                <BriefcaseIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-3">Job Management</h3>
              
              <div className="flex flex-wrap gap-2">
                <PermissionGate permissions="create_jobs">
                  <Link to="/jobs/post" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-green-700 shadow-sm hover:shadow-md border border-green-200 transition-all">
                    <PlusIcon className="h-3.5 w-3.5 mr-1" />
                    Post New Job
                  </Link>
                </PermissionGate>
                
                <PermissionGate permissions="edit_jobs">
                  <Link to="/jobs/edit" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-green-700 shadow-sm hover:shadow-md border border-green-200 transition-all">
                    <PencilIcon className="h-3.5 w-3.5 mr-1" />
                    Edit Jobs
                  </Link>
                </PermissionGate>
                
                <PermissionGate permissions="manage_jobs">
                  <Link to="/jobs/manage" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-green-700 shadow-sm hover:shadow-md border border-green-200 transition-all">
                    <BriefcaseIcon className="h-3.5 w-3.5 mr-1" />
                    Manage All Jobs
                  </Link>
                </PermissionGate>
              </div>
            </div>
          </div>
        </PermissionGate>
        
        {/* User Management Section */}
        <PermissionGate 
          permissions="manage_users" 
          fallback={<div className="hidden"></div>}
        >
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 shadow-sm border border-purple-200 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-16 h-16 -mt-4 -mr-4 bg-purple-200 opacity-30 rounded-full"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mb-4">
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-purple-900 mb-3">User Management</h3>
              
              <div className="flex flex-col gap-2">
                <PermissionGate permissions="view_users">
                  <Link to="/admin/users" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-purple-700 shadow-sm hover:shadow-md border border-purple-200 transition-all">
                    <UsersIcon className="h-3.5 w-3.5 mr-1" />
                    View All Users
                  </Link>
                </PermissionGate>
                
                <PermissionGate permissions="approve_users">
                  <Link to="/admin/approvals" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-purple-700 shadow-sm hover:shadow-md border border-purple-200 transition-all">
                    <PencilIcon className="h-3.5 w-3.5 mr-1" />
                    Review Approvals
                  </Link>
                </PermissionGate>
                
                <PermissionGate permissions="manage_roles">
                  <Link to="/admin/settings" className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-white text-purple-700 shadow-sm hover:shadow-md border border-purple-200 transition-all">
                    <Cog6ToothIcon className="h-3.5 w-3.5 mr-1" />
                    Admin Settings
                  </Link>
                </PermissionGate>
              </div>
            </div>
          </div>
        </PermissionGate>
      </div>
    </div>
  );
};

export default AdminActions;
