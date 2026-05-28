import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import { toFriendlyToast } from '../../utils/errors';
import { changeUserRole } from '../../utils/changeUserRole';
import { Link } from 'react-router-dom';
import ContentApproval from './ContentApproval';
import CSVExport from './CSVExport';
import AdminUsersPage from './users/AdminUsersPage';
import { 
  Cog6ToothIcon, 
  ShieldCheckIcon, 
  UsersIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import PermissionGate from '../PermissionGate';
import SecurityCheck from './SecurityCheck';

// Reports component that includes CSV Export functionality and Feedback Report
const Reports = () => {
  const { getUserRole, hasPermission } = useAuth();
  const userRole = getUserRole();
  const isSuperAdmin = userRole === 'super_admin';

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Reports & Data Management</h2>
      
      {isSuperAdmin && (
        <div className="mb-6 bg-white shadow rounded-lg p-4 border border-indigo-100">
          <h3 className="text-md font-medium mb-4 flex items-center text-indigo-700">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            User Feedback Reports
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            View and manage feedback submitted by users across the platform. Monitor issues, feature requests, and improvement suggestions.
          </p>
          <Link 
            to="/admin/feedback" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Feedback Reports
          </Link>
        </div>
      )}
      
      <div className="mb-6 bg-white shadow rounded-lg p-4 border border-purple-100">
        <h3 className="text-md font-medium mb-4 flex items-center text-purple-700">
          <CircleStackIcon className="h-5 w-5 mr-2" />
          Data Validation Tools
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Run data validation checks to identify integrity issues, duplicates, and inconsistencies across the platform.
        </p>
        <Link 
          to="/admin/data-tools" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Open Data Tools
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-4 border border-green-100">
        <h3 className="text-md font-medium mb-4 flex items-center text-green-700">
          <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
          CSV Import/Export
        </h3>
        <CSVExport />
      </div>
    </div>
  );
}

// System Administration component focused on super admin management
const SystemAdministration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState(null);

  // Fetch admin users when component mounts
  React.useEffect(() => {
    fetchAdminUsers();
  }, []);

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

      await fetchAdminUsers(); // Refresh the list
    } catch (err) {
      logger.error('Error updating user role:', err);
      toFriendlyToast(toast, err, 'Failed to update role. Please try again.');
    } finally {
      setShowConfirmation(false);
      setSelectedUserForRoleChange(null);
      setLoading(false);
    }
  };

  const handleEmailSearch = async () => {
    if (!targetEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .ilike('email', targetEmail.trim())
        .single();
        
      if (error) throw error;
      if (!data) {
        toast.error('No user found with that email');
        return;
      }
      
      setSelectedUserForRoleChange(data);
      setShowConfirmation(true);
    } catch (err) {
      logger.error('Error searching for user:', err);
      toast.error('Failed to find user with that email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <ShieldCheckIcon className="h-6 w-6 text-purple-700 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">System Administration</h2>
        </div>
        <p className="text-gray-600 mb-6">Manage system administrators and critical platform settings.</p>

        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Assign Super Admin Role</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="Enter user's email to find"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="flex-1 rounded border border-gray-300 p-2"
            />
            <button
              onClick={handleEmailSearch}
              disabled={loading}
              className="bg-purple-600 text-white rounded px-4 py-2 hover:bg-purple-700 transition"
            >
              {loading ? 'Searching...' : 'Find User & Assign'}
            </button>
          </div>
        </div>

        {showConfirmation && selectedUserForRoleChange && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-yellow-800 mb-2">Confirm Role Change</h4>
            <p className="text-yellow-700 mb-3">
              Are you sure you want to make <span className="font-semibold">{selectedUserForRoleChange.email}</span> a Super Admin?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSuperAdminAssignment(selectedUserForRoleChange.id, true)}
                className="bg-yellow-600 text-white rounded px-3 py-1 text-sm hover:bg-yellow-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="bg-gray-200 text-gray-700 rounded px-3 py-1 text-sm hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-4">Current Admins & Super Admins</h3>
          {loading && <p className="text-gray-500 italic">Loading administrators...</p>}
          {!loading && adminUsers.length === 0 && (
            <p className="text-gray-500">No administrators found.</p>
          )}
          {!loading && adminUsers.map(admin => (
            <div key={admin.id} className="border-b border-gray-100 py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">
                  {admin.first_name} {admin.last_name}
                </div>
                <div className="text-gray-500 text-sm">{admin.email}</div>
              </div>
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs rounded mr-4 ${admin.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
                {admin.role === 'super_admin' ? (
                  <button
                    onClick={() => {
                      setSelectedUserForRoleChange(admin);
                      setShowConfirmation(true);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={admin.id === user?.id}
                    title={admin.id === user?.id ? "You cannot revoke your own Super Admin role" : ""}
                  >
                    {admin.id !== user?.id ? 'Revoke Super Admin' : 'Current User'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedUserForRoleChange(admin);
                      setShowConfirmation(true);
                    }}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    Make Super Admin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const AdminSettings = () => {
  const { getUserRole, hasPermission, isAdminFn } = useAuth();
  const userRole = getUserRole();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isSuperAdmin = userRole === 'super_admin';
  const isAdminLike = isAdminFn();

  // Define the consolidated tabs
  const tabs = [
    {
      name: 'Users',
      icon: UsersIcon,
      component: <AdminUsersPage />,
      permission: 'approve_users',
      superAdminOnly: false,
      allowedRoles: ['admin', 'super_admin'],
    },
    {
      name: 'Content',
      icon: DocumentCheckIcon,
      component: <ContentApproval />,
      permission: 'approve_content',
      superAdminOnly: false,
    },
    {
      name: 'System',
      icon: WrenchScrewdriverIcon,
      component: <SystemAdministration />,
      permission: 'manage_settings',
      superAdminOnly: false,
    },
    {
      name: 'Security',
      icon: ShieldCheckIcon,
      component: <SecurityCheck />,
      permission: 'manage_settings',
      superAdminOnly: false,
    },
  ];

  // Only include Reports tab if user has explicit permission (Super Admin only)
  if (hasPermission('view:feedback_reports')) {
    tabs.push({
      name: 'Reports',
      icon: ClipboardDocumentListIcon,
      component: <Reports />,
      permission: 'view:feedback_reports',
      superAdminOnly: false,
    });
  }

  const availableTabs = tabs; // All tabs visible except Reports gated above

  return (
    <main id="main-content" className="space-y-6">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        {/* Header card: title, subtitle, and tab bar */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4 sm:p-5">
          <div>
            <h1 className="flex items-center text-base sm:text-lg font-semibold text-slate-900">
              <Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-ocean-600" />
              <span>Admin Settings</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage users, content, security and system configuration.
            </p>
          </div>

          <div className="mt-3 sm:mt-4 relative">
            <Tab.List
              className="flex items-center gap-1 overflow-x-auto rounded-lg bg-ocean-50/60 p-1"
              role="tablist"
            >
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tab
                    key={tab.name}
                    className={({ selected }) =>
                      `flex-shrink-0 inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        selected
                          ? 'bg-white text-ocean-700 shadow-sm border border-ocean-100'
                          : 'bg-transparent text-slate-600 hover:bg-white/60 hover:text-ocean-800'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <Icon
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            selected ? 'text-ocean-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="whitespace-nowrap">{tab.name}</span>
                      </>
                    )}
                  </Tab>
                );
              })}
            </Tab.List>
            {/* Subtle scroll affordance on mobile */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/80 to-transparent sm:hidden" />
          </div>
        </div>

        {/* Main Content with Tab Panels */}
        <div className="glass-card rounded-lg p-2 sm:p-6">
          <Tab.Panels className="mt-4">
            {availableTabs.map((tab, idx) => {
              const isRoleAllowed =
                !tab.allowedRoles || tab.allowedRoles.includes(userRole);
              const shouldUsePermissionGate =
                !isSuperAdmin &&
                (!tab.allowedRoles || !tab.allowedRoles.includes(userRole));

              const fallbackCard = (
                <div className="bg-yellow-50 p-8 rounded-lg text-center">
                  <ShieldCheckIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-yellow-800">Permission Required</h3>
                  <p className="text-yellow-700">
                    You need additional permissions to access this section.
                  </p>
                </div>
              );

              let panelContent = null;
              if (!isRoleAllowed) {
                panelContent = fallbackCard;
              } else if (shouldUsePermissionGate) {
                panelContent = (
                  <PermissionGate permissions={tab.permission} fallback={fallbackCard}>
                    {tab.component}
                  </PermissionGate>
                );
              } else {
                panelContent = tab.component;
              }

              return (
                <Tab.Panel
                  key={idx}
                  className="rounded-lg bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
                  role="tabpanel"
                >
                  {panelContent}
                </Tab.Panel>
              );
            })}
          </Tab.Panels>
        </div>
      </Tab.Group>
    </main>
  )
}

export default AdminSettings;
