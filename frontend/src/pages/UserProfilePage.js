import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import logger from '../utils/logger';
import { supabase } from '../utils/supabase';
import { MapPinIcon, BriefcaseIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Avatar from '../components/common/Avatar';
import useProfileContact from '../hooks/useProfileContact';
import { useAvatar } from '../hooks/useAvatar';
import { canViewContact } from '../utils/contactPermissions';
import LockedContactInfo from '../components/Directory/LockedContactInfo';
import ContactInfo from '../components/Directory/ContactInfo';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../utils/errors';
import { getAccountStatus } from '../utils/accountStatus';
import {
  adminUsersUpdateProfileApproval,
  adminUsersToggleActive,
  adminUsersSoftDelete,
  adminUsersPurgeData,
  adminUsersDeleteAuthUser,
} from '../api/adminUsers';
import {
  adminUpdateMenteeStatus,
  adminUpdateMentorStatus,
} from '../services/adminMentorship';
import { ConfirmationDialog } from '../components/shared';

const UserProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { avatarUrl } = useAvatar(userId, { useSignedUrl: true, autoFetch: !!userId });

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase
        .from('directory_profiles_public')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (rpcError) throw rpcError;
      setProfile(data);
    } catch (err) {
      setError('Failed to fetch user profile.');
      logger.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const contact = useProfileContact(userId);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const canHardDelete = role === 'super_admin';
  const canPurge = role === 'super_admin';

  const accountStatus = profile ? getAccountStatus(profile) : null;

  const runToggleActive = async () => {
    if (!profile) return;
    if (profile.is_deleted) return;

    const currentlyActive = profile.is_active !== false;

    setIsMutating(true);
    try {
      await adminUsersToggleActive({
        userId: profile.id,
        isActive: !currentlyActive,
        reason: currentlyActive
          ? 'Blocked from profile page'
          : 'Unblocked from profile page',
      });
      await fetchProfile();
      toast.success(currentlyActive ? 'User has been blocked.' : 'User has been unblocked.');
    } catch (err) {
      logger.error('Error toggling active from profile page:', err);
      toast.error(
        getFriendlyErrorMessage(err, 'Unable to change user active status.')
      );
    } finally {
      setIsMutating(false);
    }
  };

  const runSoftDelete = async () => {
    if (!profile) return;
    if (profile.id === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }

    setIsMutating(true);
    try {
      await adminUsersSoftDelete({
        userId: profile.id,
        reason: 'Soft delete from profile page',
      });
      await fetchProfile();
      toast.success('User soft-deleted');
    } catch (err) {
      logger.error('Error soft-deleting user from profile page:', err);
      toast.error(
        `Failed to delete user: ${getFriendlyErrorMessage(
          err,
          'Unable to delete user.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const runPurgeData = async () => {
    if (!profile) return;
    if (profile.id === currentUser?.id) {
      toast.error('You cannot purge your own account data.');
      return;
    }

    setIsMutating(true);
    try {
      await adminUsersPurgeData({ userId: profile.id });
      await fetchProfile();
      toast.success('User data purged');
    } catch (err) {
      logger.error('Error purging user data from profile page:', err);
      toast.error(
        `Failed to purge user data: ${getFriendlyErrorMessage(
          err,
          'Unable to purge user data.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  const runDeleteAuthUser = async () => {
    if (!profile) return;
    if (profile.id === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }

    setIsMutating(true);
    try {
      await adminUsersDeleteAuthUser({ userId: profile.id });
      await fetchProfile();
      toast.success('Auth user deleted successfully');
    } catch (err) {
      logger.error('Error deleting auth user from profile page:', err);
      toast.error(
        `Failed to delete auth user: ${getFriendlyErrorMessage(
          err,
          'Unable to delete auth user.'
        )}`
      );
    } finally {
      setIsMutating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-red-600">Error</h2>
        <p className="text-gray-600">{error || 'User not found.'}</p>
        <Link to="/admin/settings" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link to="/admin/settings" className="text-sm text-gray-600 hover:text-indigo-700 inline-flex items-center">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to User Management
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: detailed profile */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="h-24 w-24 rounded-full border-4 border-white flex items-center justify-center bg-white/10">
                    <Avatar
                      src={avatarUrl || profile.avatar_url || '/default-avatar.svg'}
                      alt={profile.full_name || 'Profile'}
                      size={96}
                      rounded="full"
                    />
                  </div>
                  <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                    <p className="text-md text-indigo-200">
                      {profile.current_job_title || profile.current_position || 'Position not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 px-6 py-5 sm:p-8 space-y-6">
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Profile Overview</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Role</dt>
                      <dd className="mt-1 text-gray-900 capitalize">{profile.role || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Account Status</dt>
                      <dd className="mt-1 text-gray-900">{accountStatus?.label || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Approval Status</dt>
                      <dd className="mt-1 text-gray-900">{profile.approval_status || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Directory Visibility</dt>
                      <dd className="mt-1 text-gray-900">
                        {profile.show_in_directory ? 'Shown in directory' : 'Hidden from directory'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Active</dt>
                      <dd className="mt-1 text-gray-900">
                        {profile.is_active === false ? 'No' : 'Yes'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Deleted</dt>
                      <dd className="mt-1 text-gray-900">{profile.is_deleted ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-4">
                    {contact.loading ? (
                      <p className="text-sm text-gray-500">Loading contact details...</p>
                    ) : !canViewContact(contact) ? (
                      <LockedContactInfo />
                    ) : (
                      <ContactInfo email={contact.email} phone_number={contact.phone_number} />
                    )}
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                          Location
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {profile.location || profile.location_city || profile.location_country ||
                            'Not specified'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Bio</dt>
                        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {profile.bio || 'No bio available.'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Education &amp; Career</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Graduation Year</dt>
                      <dd className="mt-1 text-gray-900">{profile.graduation_year || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Degree Program</dt>
                      <dd className="mt-1 text-gray-900">{profile.degree_program || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Department</dt>
                      <dd className="mt-1 text-gray-900">{profile.department || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Company</dt>
                      <dd className="mt-1 text-gray-900">{profile.company_name || 'N/A'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-gray-500">Current Role</dt>
                      <dd className="mt-1 text-gray-900">
                        {profile.current_job_title || profile.current_position || 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          </div>

          {/* Right: admin + mentorship actions */}
          {isAdmin && (
            <aside className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Admin Actions</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Visible only to admins and super admins. These actions apply to this profile.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Approve */}
                  <button
                    type="button"
                    disabled={isMutating || accountStatus?.code === 'approved'}
                    onClick={async () => {
                      setIsMutating(true);
                      try {
                        await adminUsersUpdateProfileApproval({
                          profileId: profile.id,
                          decision: 'approve',
                          notes: null,
                        });
                        await fetchProfile();
                        toast.success('User has been approved.');
                      } catch (err) {
                        logger.error('Error approving user from profile page:', err);
                        toast.error(
                          `Failed to approve user: ${getFriendlyErrorMessage(
                            err,
                            'Unable to approve user.'
                          )}`
                        );
                      } finally {
                        setIsMutating(false);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-emerald-500 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve user
                  </button>

                  {/* Reject */}
                  <button
                    type="button"
                    disabled={isMutating || accountStatus?.code === 'rejected'}
                    onClick={async () => {
                      const reason = window.prompt('Reason for rejection (optional):');
                      setIsMutating(true);
                      try {
                        await adminUsersUpdateProfileApproval({
                          profileId: profile.id,
                          decision: 'reject',
                          notes: reason || null,
                        });
                        await fetchProfile();
                        toast.success('User has been rejected.');
                      } catch (err) {
                        logger.error('Error rejecting user from profile page:', err);
                        toast.error(
                          `Failed to reject user: ${getFriendlyErrorMessage(
                            err,
                            'Unable to reject user.'
                          )}`
                        );
                      } finally {
                        setIsMutating(false);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-amber-500 text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject user
                  </button>

                  {/* Block / Unblock */}
                  <button
                    type="button"
                    disabled={isMutating || profile.is_deleted}
                    onClick={async () => {
                      if (profile.is_deleted) return;

                      const currentlyActive = profile.is_active !== false;
                      const confirmLabel = currentlyActive
                        ? `Block ${profile.email || profile.full_name || 'this user'}? They will not be able to use the platform.`
                        : `Unblock ${profile.email || profile.full_name || 'this user'} and allow access again?`;
                      setConfirmDialog({
                        type: 'toggle-active',
                        message: confirmLabel,
                        currentlyActive,
                      });
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-orange-500 text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profile.is_active === false ? 'Unblock user' : 'Block user'}
                  </button>

                  {/* Soft delete */}
                  <button
                    type="button"
                    title="Soft delete: close the account but keep all data. User becomes read-only and cannot perform new actions. Contact your administrator for more information."
                    disabled={isMutating || profile.id === currentUser?.id}
                    onClick={async () => {
                      if (profile.id === currentUser?.id) {
                        toast.error('You cannot delete your own account.');
                        return;
                      }

                      setConfirmDialog({
                        type: 'soft-delete',
                        message: `Are you sure you want to soft delete user ${profile.email || profile.id}? They can be restored later.`,
                      });
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-red-500 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Soft delete user
                  </button>

                  {/* Purge data (super admin, deleted only) */}
                  {canPurge && profile.is_deleted && (
                    <button
                      type="button"
                      title="Purge data: permanently remove this user's data from the app. This cannot be undone. Contact your administrator for more information."
                      disabled={isMutating || profile.id === currentUser?.id}
                      onClick={async () => {
                        if (profile.id === currentUser?.id) {
                          toast.error('You cannot purge your own account data.');
                          return;
                        }

                        setConfirmDialog({
                          type: 'purge',
                          message: `Are you sure you want to PERMANENTLY PURGE all data for user ${
                            profile.email || profile.id
                          }? This cannot be undone!`,
                        });
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-red-600 text-red-800 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Purge data
                    </button>
                  )}

                  {/* Delete Auth user (super admin, deleted only) */}
                  {canHardDelete && profile.is_deleted && (
                    <button
                      type="button"
                      title="Delete Auth user: remove this user's data and login from the system. This cannot be undone. Contact your administrator for more information."
                      disabled={isMutating || profile.id === currentUser?.id}
                      onClick={async () => {
                        if (profile.id === currentUser?.id) {
                          toast.error('You cannot delete your own account.');
                          return;
                        }

                        setConfirmDialog({
                          type: 'delete-auth',
                          message: `This will permanently delete the user from Supabase Auth. Continue for ${
                            profile.email || profile.id
                          }?`,
                        });
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-red-700 text-red-900 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete Auth user
                    </button>
                  )}
                </div>
              </div>

              {/* Mentorship actions removed per requirement */}
            </aside>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'toggle-active'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runToggleActive();
          setConfirmDialog(null);
        }}
        title={confirmDialog?.currentlyActive ? 'Block user' : 'Unblock user'}
        description={confirmDialog?.message || ''}
        variant="warning"
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'soft-delete'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runSoftDelete();
          setConfirmDialog(null);
        }}
        title="Soft delete user"
        description={confirmDialog?.message || ''}
        variant="danger"
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'purge'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runPurgeData();
          setConfirmDialog(null);
        }}
        title="Purge user data"
        description={confirmDialog?.message || ''}
        variant="danger"
      />
      <ConfirmationDialog
        isOpen={confirmDialog?.type === 'delete-auth'}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          await runDeleteAuthUser();
          setConfirmDialog(null);
        }}
        title="Delete Auth user"
        description={confirmDialog?.message || ''}
        variant="danger"
      />
    </div>
  );
};

export default UserProfilePage;

