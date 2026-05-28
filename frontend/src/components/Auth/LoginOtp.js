import logger from '../../utils/logger';
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Logo from '../common/Logo';
import OtpInput from './OtpInput';
import { useAuth } from '../../contexts/AuthContext';
import { signInWithEmailOtp, sendMagicLink, verifyEmailOtp } from '../../utils/supabase';
import { getFriendlyErrorMessage } from '../../utils/errors';

const LoginOtp = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  if (user && !authLoading) {
    return <Navigate to="/profile" replace />;
  }

  const onSendOtp = async () => {
    setError(''); setStatus(''); setLoading(true);
    try {
      const { error } = await signInWithEmailOtp(email, { shouldCreateUser: true });
      if (error) setError(getFriendlyErrorMessage(error, 'Failed to send OTP.'));
      else setStatus('OTP sent. Check your inbox.');
    } catch (e) {
      setError('Failed to send OTP.');
      logger.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onSendMagic = async () => {
    setError(''); setStatus(''); setLoading(true);
    try {
      const { error } = await sendMagicLink(email, { shouldCreateUser: true });
      if (error) setError(getFriendlyErrorMessage(error, 'Failed to send magic link.'));
      else setStatus('Magic link sent. Check your inbox.');
    } catch (e) {
      setError('Failed to send magic link.');
      logger.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError(''); setStatus(''); setLoading(true);
    try {
      const { data, error } = await verifyEmailOtp(email, code.replace(/\s/g, ''));
      if (error) setError(getFriendlyErrorMessage(error, 'Failed to verify code.'));
      else if (data?.session) {
        window.location.href = '/profile';
        return;
      } else {
        setStatus('Code verified. Finalizing sign-in...');
      }
    } catch (e) {
      setError('Failed to verify code.');
      logger.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/">
            <Logo className="mx-auto h-16 w-auto" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Sign in with Email OTP</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your email to receive a one-time code (or a magic link).</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {status && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">{status}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onSendOtp} disabled={loading || !email} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <button onClick={onSendMagic} disabled={loading || !email} className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Enter Code</label>
            <OtpInput value={code} onChange={setCode} />
            <button onClick={onVerify} disabled={loading || code.replace(/\D/g, '').length < 6} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Prefer password login?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Go to Password Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginOtp;
