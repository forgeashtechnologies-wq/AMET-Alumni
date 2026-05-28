import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { toFriendlyToast } from '../../utils/errors';
import logger from '../../utils/logger';
import { changeUserRole } from '../../utils/changeUserRole';
import {
  ShieldCheckIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  UserGroupIcon, 
  BriefcaseIcon, 
  CalendarDaysIcon, 
} from '@heroicons/react/24/outline';

const ManageSuperAdmins = ({ isSuperAdmin }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdminUsers();
    }
  }, [isSuperAdmin]);

  const fetchAdminUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .or('role.eq.admin,role.eq.super_admin')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setAdminUsers(data || []);
    } catch (err) {
      logger.error('Error fetching admin users:', err);
      toFriendlyToast(toast, err, 'Could not load admin users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuperAdminAssignment = async (userIdToUpdate, makeSuperAdmin) => {
    setLoading(true);
    try {
      const target =
        adminUsers.find((u) => u.id === userIdToUpdate) || selectedUserForRoleChange;

      const oldRole = target?.role || 'admin';
      const newRole = makeSuperAdmin ? 'super_admin' : 'admin';

      const { success } = await changeUserRole({
        userId: userIdToUpdate,
        oldRole,
        newRole,
      });

      if (!success) {
        return;
      }

      await fetchAdminUsers();
    } catch (err) {
      logger.error('Error updating user role:', err);
      toFriendlyToast(toast, err, 'Failed to update user role. Please try again.');
    } finally {
      setShowConfirmation(false);
      setSelectedUserForRoleChange(null);
      setLoading(false);
    }
  };

  const findUserByEmailAndPrompt = async () => {
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Please enter a valid email.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .ilike('email', targetEmail)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('No user found with this email.');
        return;
      }
      const foundUser = data[0];
      if (foundUser.id === user.id) {
        toast.error('You cannot change your own role.');
        return;
      }
      setSelectedUserForRoleChange(foundUser);
      setShowConfirmation(true);
    } catch (err) {
      logger.error('Error finding user:', err);
      toFriendlyToast(toast, err, 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <KeyIcon className="h-6 w-6 mr-2 text-purple-600" /> Assign Super Admin Role
        </h4>
        <div className="flex items-center space-x-3 mb-6">
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="Enter user's email to find"
            className="form-input flex-grow px-3 py-2 rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500"
          />
          <button
            onClick={findUserByEmailAndPrompt}
            disabled={loading}
            className="btn-primary bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center justify-center disabled:opacity-50 whitespace-nowrap"
          >
            Find User & Assign
          </button>
        </div>

        <h4 className="text-lg font-semibold text-gray-800 mb-2">Current Admins & Super Admins</h4>
        {loading && adminUsers.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : adminUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No admin users found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {adminUsers.map((admin) => (
              <li key={admin.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{admin.first_name} {admin.last_name}</span>
                      {admin.role === 'super_admin' && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Super Admin
                        </span>
                      )}
                       {admin.role === 'admin' && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{admin.email}</p>
                  </div>
                  {admin.id !== user?.id && (
                    <button
                      onClick={() => {
                        setSelectedUserForRoleChange(admin);
                        setShowConfirmation(true);
                      }}
                      className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm ${
                        admin.role === 'super_admin'
                          ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                          : 'border-purple-300 text-purple-700 bg-white hover:bg-purple-50'
                      }`}
                    >
                      {admin.role === 'super_admin' ? 'Revoke Super Admin' : 'Make Super Admin'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showConfirmation && selectedUserForRoleChange && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Confirm Role Change</h3>
            <p className="text-sm text-gray-600 mb-2">
              For user: <span className="font-semibold">{selectedUserForRoleChange.email}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to {
                selectedUserForRoleChange.role === 'super_admin'
                  ? <span className="font-bold text-red-600">revoke</span>
                  : <span className="font-bold text-purple-600">grant</span>
              } Super Admin privileges?
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {selectedUserForRoleChange.role !== 'super_admin' 
                ? 'Granting Super Admin gives complete control over the system.' 
                : 'Revoking Super Admin will demote the user to a regular Admin role (if applicable) or default role.'}
            </p>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowConfirmation(false); setSelectedUserForRoleChange(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const makeSuperAdmin = selectedUserForRoleChange.role !== 'super_admin';
                  handleSuperAdminAssignment(selectedUserForRoleChange.id, makeSuperAdmin);
                }}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  selectedUserForRoleChange.role === 'super_admin'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                }`}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewUsers = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <UserGroupIcon className="h-6 w-6 mr-2 text-blue-600" /> User Approval Queue
      </h4>
      <p className="text-gray-600">This section will display users awaiting approval or changes requiring review. Functionality coming soon.</p>
      {/* TODO: Implement user review list, filter, approve/reject actions */}
    </div>
  );
};

const ReviewJobs = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <BriefcaseIcon className="h-6 w-6 mr-2 text-green-600" /> Job Posting Approval Queue
      </h4>
      <p className="text-gray-600">This section will display job postings awaiting approval. Functionality coming soon.</p>
      {/* TODO: Implement job review list, filter, approve/reject actions */}
    </div>
  );
};

const ReviewEvents = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <CalendarDaysIcon className="h-6 w-6 mr-2 text-yellow-600" /> Event Submission Approval Queue
      </h4>
      <p className="text-gray-600">This section will display event submissions awaiting approval. Functionality coming soon.</p>
      {/* TODO: Implement event review list, filter, approve/reject actions */}
    </div>
  );
};

const SuperAdminPanel = () => {
  const { getUserRole } = useAuth();
  const [activeTab, setActiveTab] = useState('manageSuperAdmins');
  const currentRole = getUserRole();
  const isSuperAdmin = currentRole === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md mx-auto max-w-2xl my-10">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-8 w-8 mr-3" />
          <div>
            <h3 className="text-xl font-semibold">Access Denied</h3>
            <p className="mt-1">This panel is restricted to Super Administrators only.</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'manageSuperAdmins', label: 'Manage Super Admins', icon: KeyIcon, component: <ManageSuperAdmins isSuperAdmin={isSuperAdmin} /> },
    { id: 'reviewUsers', label: 'Review Users', icon: UserGroupIcon, component: <ReviewUsers /> },
    { id: 'reviewJobs', label: 'Review Jobs', icon: BriefcaseIcon, component: <ReviewJobs /> },
    { id: 'reviewEvents', label: 'Review Events', icon: CalendarDaysIcon, component: <ReviewEvents /> },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gradient-to-br from-gray-100 via-purple-50 to-indigo-100 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-full mr-4">
            <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h2>
            <p className="text-md text-gray-600 mt-1">
              Oversee critical system settings, user roles, and content approvals.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b border-gray-200 px-2 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm focus:outline-none rounded-t-md transition-colors duration-150 ease-in-out ${
                  activeTab === tab.id
                    ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
