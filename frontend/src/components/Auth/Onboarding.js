import logger from '../../utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import LoadingSpinner from '../common/LoadingSpinner';

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        setHasProfile(!!data);
      } catch (e) {
        logger.error('Onboarding error:', e);
        setError('Unable to load onboarding.');
      } finally {
        setLoading(false);
      }
    };

    // Refresh session/JWT to avoid protected-route 403 timing issues
    (async () => {
      try { await supabase.auth.refreshSession(); } catch (e) { /* ignore refresh errors */ }
      checkProfile();
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ocean-50 flex items-center justify-center">
        <LoadingSpinner message="Preparing your account..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ocean-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Onboarding Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-ocean px-4 py-2 rounded-lg">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ocean-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Welcome to AMET Alumni</h1>
        {hasProfile ? (
          <>
            <p className="text-gray-700 mb-6">You're all set. Head to your dashboard to get started.</p>
            <button onClick={() => navigate('/dashboard')} className="btn-ocean px-5 py-2 rounded-lg">Go to Dashboard</button>
          </>
        ) : (
          <>
            <p className="text-gray-700 mb-6">Let's complete your profile before you continue.</p>
            <button onClick={() => navigate('/profile')} className="btn-ocean px-5 py-2 rounded-lg">Complete Profile</button>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
