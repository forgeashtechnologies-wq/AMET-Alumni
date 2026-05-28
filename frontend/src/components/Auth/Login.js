import logger from '../../utils/logger';
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Logo from '../common/Logo';
import { signInWithEmail, signInWithGoogle, signInWithLinkedIn } from '../../utils/supabase';
import { getFriendlyErrorMessage } from '../../utils/errors';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
    otpCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // If we're in 2FA mode, include the OTP code
      const { data, error, requiresTwoFactor: requires2FA } = await signInWithEmail(
        formData.email, 
        formData.password,
        requiresTwoFactor ? formData.otpCode : null
      );
      
      if (requires2FA) {
        setRequiresTwoFactor(true);
        setError('Please enter the verification code from your authenticator app');
        setIsLoading(false);
        return;
      }
      
      if (error) {
        setError(getFriendlyErrorMessage(error, 'Sign-in failed. Please try again.'));
        return;
      }

      if (data.user) {
        logger.log('Login successful, forcing redirect to dashboard...');
        // Force direct navigation to dashboard without waiting for AuthContext
        setIsLoading(true); // Keep loading state while we redirect
        
        // Small timeout to ensure Supabase has time to save the session
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
        return; // Exit early since we're redirecting
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      logger.error('Login error:', err);
    } finally {
      if (!requiresTwoFactor) { // Don't disable loading if we're redirecting
        setIsLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(getFriendlyErrorMessage(error, 'Failed to sign in with Google. Please try again.'));
        setIsLoading(false);
        return;
      }
      logger.log('Google login successful, redirecting to dashboard...');
      // Redirect will happen via the OAuth flow and return URL
    } catch (err) {
      setError('Failed to sign in with Google');
      logger.error('Google login error:', err);
      setIsLoading(false);
    }
  };

  const handleLinkedInLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { error } = await signInWithLinkedIn();
      if (error) {
        setError(getFriendlyErrorMessage(error, 'Failed to sign in with LinkedIn. Please try again.'));
        setIsLoading(false);
        return;
      }
      logger.log('LinkedIn login successful, redirecting to dashboard...');
      // Redirect will happen via the OAuth flow and return URL
    } catch (err) {
      setError('Failed to sign in with LinkedIn');
      logger.error('LinkedIn login error:', err);
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };



  // If a user is already authenticated when the component mounts, redirect immediately.
  if (user && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back to Home Link */}
        <div>
          <Link to="/" className="inline-flex items-center text-sm font-medium text-ocean-600 hover:text-ocean-800">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center">
          <Link to="/">
            <Logo className="mx-auto h-14 sm:h-16 w-auto" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your AMET Alumni account
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div id="login-error" role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
                value={formData.email}
                onChange={handleChange}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full px-3 py-2 border-2 border-ocean-200 rounded-lg min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:border-ocean-500 placeholder:text-gray-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full px-3 py-2 pr-10 border-2 border-ocean-200 rounded-lg min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:border-ocean-500 placeholder:text-gray-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-ocean-600 focus-visible:ring-2 focus-visible:ring-ocean-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-ocean-600 hover:text-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded">
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Two-Factor Authentication Code Input */}
            {requiresTwoFactor && (
              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  required
                  value={formData.otpCode}
                  onChange={handleChange}
                  aria-describedby="otp-help"
                  className="w-full px-3 py-2 border-2 border-ocean-200 rounded-lg min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:border-ocean-500 placeholder:text-gray-500"
                  placeholder="Enter 6-digit code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="6"
                />
                <p id="otp-help" className="mt-1 text-sm text-gray-500">
                  Enter the verification code from your authenticator app
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-b from-ocean-500 to-ocean-600 text-white py-3 px-4 rounded-lg font-medium min-h-[44px] hover:from-ocean-600 hover:to-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Signing in...</span>
                </div>
              ) : requiresTwoFactor ? (
                'Verify Code'
              ) : (
                'Sign In'
              )}
            </button>

            {/* Social Login */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                aria-label="Sign in with Google"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-2">Google</span>
              </button>

              <button
                type="button"
                onClick={handleLinkedInLogin}
                aria-label="Sign in with LinkedIn"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="#0077B5" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="ml-2">LinkedIn</span>
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-ocean-600 hover:text-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;