import logger from '../../utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../constants/support';

const RejectionPage = () => {
  const navigate = useNavigate();
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRejectionReason = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('rejection_reason')
          .eq('id', session.user.id)
          .single();

        if (error) {
          throw error;
        }

        setRejectionReason(data.rejection_reason || 'Your registration was rejected by an administrator.');
      } catch (err) {
        logger.error('Error fetching rejection reason:', err);
        setError('Unable to fetch rejection details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRejectionReason();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white shadow-lg rounded-xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Profile Rejected</h2>
        {error ? (
          <p className="mb-4 text-gray-800">{error}</p>
        ) : (
          <p className="mb-4 text-gray-800">{rejectionReason}</p>
        )}
        <p className="mb-6 text-gray-600">If you believe this is a mistake, please contact <a href={SUPPORT_MAILTO} className="text-blue-600">{SUPPORT_EMAIL}</a>.</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default RejectionPage;
