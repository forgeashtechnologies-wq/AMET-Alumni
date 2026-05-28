import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { validatePassword } from '../../utils/passwordPolicy';

/**
 * ForgotPassword with dual reset paths:
 * 1. Email reset (standard Supabase flow)
 * 2. Security Question reset (new secure flow)
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // Step: 'email' | 'choose' | 'security_question' | 'new_password' | 'email_sent' | 'success'
  const [step, setStep] = useState('email');
  
  // Form state
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  // Step 1: Submit email to check if security question exists
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error: rpcError } = await supabase.rpc('get_security_question_for_email', {
        p_email: email.trim().toLowerCase(),
        p_ip_address: null // Could pass client IP if available
      });

      if (rpcError) throw rpcError;

      if (data?.success && data?.has_question) {
        setSecurityQuestion(data.question);
        setStep('choose'); // Let user choose between email or security question
      } else {
        // No security question set - go straight to email option
        setStep('choose');
        setSecurityQuestion(null);
      }
    } catch (err) {
      // On error, still show choose step with email-only option
      setStep('choose');
      setSecurityQuestion(null);
      setError('Could not check security question. You can still use email reset.');
    } finally {
      setLoading(false);
    }
  };

  // Handle email reset (standard flow)
  const handleEmailReset = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      
      setStep('email_sent');
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify security answer
  const handleSecurityAnswer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRemainingAttempts(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_security_answer_for_reset', {
        p_email: email.trim().toLowerCase(),
        p_answer: answer,
        p_ip_address: null
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        setResetToken(data.reset_token);
        setStep('new_password');
        setMessage('Verification successful! Please set your new password.');
      } else {
        setError(data?.message || 'Verification failed.');
        if (data?.remaining_attempts !== undefined) {
          setRemainingAttempts(data.remaining_attempts);
        }
        if (data?.lockout_until) {
          setLockoutUntil(new Date(data.lockout_until));
        }
        if (data?.error === 'account_locked') {
          setLockoutUntil(new Date(data.lockout_until || Date.now() + 30 * 60 * 1000));
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleNewPassword = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password policy
    const policy = validatePassword(newPassword, email);
    if (!policy.ok) {
      setError(policy.message);
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('reset_password_with_security_token', {
        p_token: resetToken,
        p_new_password: newPassword
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        setStep('success');
        setMessage(data.message || 'Password reset successfully!');
      } else {
        setError(data?.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. The token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    setError('');
    setMessage('');
    if (step === 'choose') {
      setStep('email');
    } else if (step === 'security_question') {
      setStep('choose');
      setAnswer('');
    } else if (step === 'new_password') {
      // Can't go back from new_password (token already issued)
      setStep('choose');
      setAnswer('');
      setResetToken('');
    }
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <form className="space-y-6" onSubmit={handleEmailSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        );

      case 'choose':
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </button>

            <p className="text-sm text-gray-600 mb-4">
              Choose how you'd like to reset your password:
            </p>

            {/* Security Question Option (now shown first) */}
            {securityQuestion && (
              <button
                type="button"
                onClick={() => setStep('security_question')}
                disabled={loading || lockoutUntil}
                className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Security Question</p>
                    <p className="text-sm text-gray-500">Answer your security question to reset</p>
                  </div>
                </div>
              </button>
            )}

            {/* Email Reset Option */}
            <button
              type="button"
              onClick={handleEmailReset}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center">
                <EnvelopeIcon className="w-6 h-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Email Reset Link</p>
                  <p className="text-sm text-gray-500">We'll send a reset link to your email</p>
                </div>
              </div>
              {loading && (
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </button>

            {!securityQuestion && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  No security question set for this account. You can set one after logging in.
                </p>
              </div>
            )}

            {lockoutUntil && lockoutUntil > new Date() && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Security question reset is temporarily locked due to too many failed attempts. 
                  Please use email reset or try again later.
                </p>
              </div>
            )}
          </div>
        );

      case 'security_question':
        return (
          <form className="space-y-6" onSubmit={handleSecurityAnswer}>
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </button>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Security Question:</p>
              <p className="text-blue-700">{securityQuestion}</p>
            </div>

            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <input
                id="answer"
                name="answer"
                type="text"
                required
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Answer is case-insensitive</p>
            </div>

            {remainingAttempts !== null && remainingAttempts <= 2 && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !answer}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Answer'}
            </button>
          </form>
        );

      case 'new_password':
        return (
          <form className="space-y-6" onSubmit={handleNewPassword}>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Identity verified! Please set your new password.
              </p>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <p className="text-xs text-gray-500">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character.
            </p>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        );

      case 'email_sent':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <EnvelopeIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Check Your Email</h3>
            <p className="text-gray-600">
              {message || "If an account with that email exists, a password reset link has been sent."}
            </p>
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setMessage('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Password Reset Complete</h3>
            <p className="text-gray-600">
              {message || "Your password has been reset successfully."}
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign In
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Get step title
  const getTitle = () => {
    switch (step) {
      case 'email':
        return 'Forgot Your Password?';
      case 'choose':
        return 'Reset Your Password';
      case 'security_question':
        return 'Verify Your Identity';
      case 'new_password':
        return 'Set New Password';
      case 'email_sent':
        return 'Email Sent';
      case 'success':
        return 'Success!';
      default:
        return 'Forgot Password';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'email':
        return 'Enter your email to get started.';
      case 'choose':
        return `Resetting password for ${email}`;
      case 'security_question':
        return 'Answer your security question to verify your identity.';
      case 'new_password':
        return 'Choose a strong password for your account.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg mb-6">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{getTitle()}</h2>
          {getSubtitle() && (
            <p className="mt-2 text-gray-600">{getSubtitle()}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {renderStep()}
        </div>

        {step !== 'success' && step !== 'email_sent' && (
          <div className="text-center">
            <p className="text-gray-600">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
