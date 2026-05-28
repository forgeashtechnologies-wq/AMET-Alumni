import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, session, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const roles = [
    {
      id: 'alumni',
      name: 'Alumni',
      description: 'Connect with fellow alumni, access job opportunities, and give back to your alma mater.',
      icon: '🎓'
    },
    {
      id: 'student',
      name: 'Student',
      description: 'Access mentorship programs, job listings, and build your professional network while studying.',
      icon: '📚'
    },
    {
      id: 'employer',
      name: 'Employer',
      description: 'Post job opportunities, find talented alumni, and engage with the community.',
      icon: '💼'
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError('');
  };

  const handleContinue = async () => {
    if (!selectedRole || !user?.id) return;

    setLoading(true);
    setError('');

    try {
      // Call Supabase Edge Function to set role securely
      const endpoint = process.env.REACT_APP_SUPABASE_URL
        ? `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/set-role`
        : '/functions/v1/set-role';

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          ...(process.env.REACT_APP_SUPABASE_KEY ? { 'apikey': process.env.REACT_APP_SUPABASE_KEY } : {}),
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => 'Failed to set role.');
        throw new Error(msg || 'Failed to set role.');
      }

      // Refresh JWT so RLS policies see the updated role immediately
      try {
        await supabase.auth.refreshSession();
      } catch (_) {
        // ignore refresh errors; profile fetch below will still proceed
      }

      // Mark confirmation to avoid re-prompting on refresh
      try {
        window.localStorage.setItem(`role_confirmed_${user.id}`, '1');
      } catch {
        // ignore localStorage errors
      }

      // Refresh profile
      await refreshProfile(user.id);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg mb-6">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome to AMET Alumni Network!</h2>
          <p className="mt-2 text-gray-600">
            Choose your role to personalize your experience and unlock the right features for you.
          </p>
          <div className="mt-4 text-left mx-auto max-w-xl p-4 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              This one-time setup helps us tailor your dashboard. You can request a role change later from Profile Settings if needed.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => !loading && handleRoleSelect(role.id)}
              className={`cursor-pointer p-6 rounded-lg border-2 transition-all ${
                selectedRole === role.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{role.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{role.name}</h3>
                <p className="text-gray-600 text-sm">{role.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className="w-full md:w-auto px-8 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Setting up your account...' : (error ? 'Retry' : 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
