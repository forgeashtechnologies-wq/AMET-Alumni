import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { adminUpdateProfileApproval, adminListProfilesForApproval } from '../../api/admin';
import { 
  CheckIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline';

const UserApprovalDashboard = () => {
  const { getUserRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchPendingEmployers = async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const rows = await adminListProfilesForApproval({
        status: 'pending',
        role: 'employer',
        search: null,
        limit: 50,
        offset: 0,
      });

      const data = Array.isArray(rows) ? rows : [];

      const formattedData = data.map(user => ({
        ...user,
        name:
          (user.full_name && String(user.full_name).trim()) ||
          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
          'Unknown',
        registeredAt: user.created_at || user.registered_at || user.inserted_at || user.createdAt,
      }));

      setUsers(formattedData);
    } catch (error) {
      logger.error('Error fetching pending employers:', error);
      setFetchError('Failed to load pending employer approvals');
      toast.error('Failed to load pending approvals');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    const userRole = getUserRole();
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      toast.error('You do not have permission to access this page');
      return;
    }
    fetchPendingEmployers();
  }, [getUserRole]);

  const handleApprovalAction = async (userId, newStatus) => {
    setLoading(true);
    try {
      await adminUpdateProfileApproval({
        profileId: userId,
        decision: newStatus === 'approved' ? 'approve' : 'reject',
        notes: null,
      });

      // Refetch the list so we respect server-side filters and audit logic
      await fetchPendingEmployers();
      toast.success(`Employer has been ${newStatus}.`);
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      logger.error(`Error updating user status:`, error);
      toast.error(`Failed to update user status. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Employer Approvals</h2>
        
        {fetchLoading && <p className="text-center py-4">Loading pending approvals...</p>}
        {fetchError && <p className="text-red-500 text-center py-4">{fetchError}</p>}
        
        {!fetchLoading && !fetchError && users.length === 0 && (
          <p className="text-center text-gray-500 py-4">No pending employer approvals.</p>
        )}

        {!fetchLoading && !fetchError && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.company_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.registeredAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openUserModal(user)} className="text-indigo-600 hover:text-indigo-900">View &rarr;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Review Employer Application</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 py-4 border-t border-b">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-500">Name</label><p>{selectedUser.name}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Email</label><p>{selectedUser.email}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Company</label><p>{selectedUser.company_name || 'N/A'}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Job Title</label><p>{selectedUser.job_title || 'N/A'}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Industry</label><p>{selectedUser.industry || 'N/A'}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Company Size</label><p>{selectedUser.company_size || 'N/A'}</p></div>
                {selectedUser.website && <div><label className="block text-sm font-medium text-gray-500">Website</label><a href={selectedUser.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedUser.website}</a></div>}
                {selectedUser.linkedin_profile && <div><label className="block text-sm font-medium text-gray-500">LinkedIn</label><a href={selectedUser.linkedin_profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedUser.linkedin_profile}</a></div>}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => handleApprovalAction(selectedUser.id, 'rejected')}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5 mr-2" /> {loading ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => handleApprovalAction(selectedUser.id, 'approved')}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckIcon className="w-5 h-5 mr-2" /> {loading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserApprovalDashboard;