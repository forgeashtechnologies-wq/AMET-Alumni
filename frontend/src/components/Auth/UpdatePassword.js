import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { validatePassword } from '../../utils/passwordPolicy';
import SecurityQuestionForm from '../Profile/SecurityQuestionForm';
import { getFriendlyErrorMessage } from '../../utils/errors';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Check if we have a valid session for password update
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    checkSession();
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password policy
    const policy = validatePassword(password, user?.email);
    if (!policy.ok) {
      setError(policy.message);
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(getFriendlyErrorMessage(error, 'Failed to update password.'));
    } else {
      setMessage('Your password has been updated successfully. You will be signed out for security.');

      // Sign out for security after password change with error handling
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          logger.warn('Signout failed, but password was updated successfully:', signOutError);
        }
        // Always redirect to login, even if signout fails
        navigate('/login');
      }, 2000);
    }
    setLoading(false);
  };

  if (hasSession === null) {
    // Still checking session
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Verifying your session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasSession === false) {
    // No valid session - link expired
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Link Expired</h2>
            <p className="mt-2 text-gray-600">
              Your password reset link has expired or is invalid.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Don't worry! You can request a new password reset link.
              </p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Request New Reset Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Update Your Password</h2>
          <p className="mt-2 text-gray-600">Enter a new password for your account.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <form className="space-y-6" onSubmit={handlePasswordUpdate}>
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{message}</p>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Security Question configuration stays with password updates */}
          <div className="pt-2 border-t border-gray-200 space-y-3">
            <p className="text-sm text-gray-700">
              Add a security question here to improve account recovery.
            </p>
            <SecurityQuestionForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;
