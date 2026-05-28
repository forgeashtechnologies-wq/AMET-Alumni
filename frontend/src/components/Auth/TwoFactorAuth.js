import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  LockClosedIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const TwoFactorAuth = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [recoveryKeys, setRecoveryKeys] = useState([]);
  const [showRecoveryKeys, setShowRecoveryKeys] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkTwoFactorStatus();
  }, [user]);

  const checkTwoFactorStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setIs2FAEnabled(data?.two_factor_enabled || false);
    } catch (err) {
      logger.error('Error checking 2FA status:', err);
    }
  };

  const setupTwoFactor = async () => {
    setLoading(true);
    setError('');
    
    try {
      // In a real implementation, this would call a backend endpoint to generate a secret
      // For demo purposes, we'll simulate this with a frontend call
      const { data, error } = await supabase.functions.invoke('generate-2fa-secret', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      setSecret(data.secret);
      setQrCode(data.qrCodeUrl);
      setSetupMode(true);
      setVerifyMode(false);
    } catch (err) {
      logger.error('Error setting up 2FA:', err);
      setError('Failed to set up two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnableTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Verify the code with the backend
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { 
          user_id: user.id,
          secret: secret,
          token: verificationCode 
        }
      });
      
      if (error) throw error;
      
      if (!data.valid) {
        setError('Invalid verification code. Please try again.');
        return;
      }
      
      // Generate recovery keys
      const { data: recoveryData, error: recoveryError } = await supabase.functions.invoke('generate-recovery-keys', {
        body: { user_id: user.id }
      });
      
      if (recoveryError) throw recoveryError;
      
      // Update user profile to enable 2FA
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: true,
          two_factor_secret: data.encryptedSecret
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setRecoveryKeys(recoveryData.keys);
      setShowRecoveryKeys(true);
      setIs2FAEnabled(true);
      setSetupMode(false);
      setVerifyMode(false);
      
      toast.success('Two-factor authentication has been enabled!');
    } catch (err) {
      logger.error('Error verifying 2FA:', err);
      setError('Failed to verify and enable two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    setLoading(true);
    setError('');
    setVerifyMode(true);
    setSetupMode(false);
  };

  const confirmDisableTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Verify the code with the backend
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { 
          user_id: user.id,
          token: verificationCode,
          verify_only: true
        }
      });
      
      if (error) throw error;
      
      if (!data.valid) {
        setError('Invalid verification code. Please try again.');
        return;
      }
      
      // Update user profile to disable 2FA
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: false,
          two_factor_secret: null
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setIs2FAEnabled(false);
      setVerifyMode(false);
      setVerificationCode('');
      
      toast.success('Two-factor authentication has been disabled.');
    } catch (err) {
      logger.error('Error disabling 2FA:', err);
      setError('Failed to disable two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryKeysSaved = () => {
    setShowRecoveryKeys(false);
    toast.success('Make sure to store your recovery keys in a safe place!');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <ShieldCheckIcon className="w-6 h-6 mr-2 text-ocean-600" />
          Two-Factor Authentication
        </h2>
        {is2FAEnabled && (
          <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full flex items-center">
            <CheckIcon className="w-4 h-4 mr-1" />
            Enabled
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-lg font-medium text-gray-800 mb-2">What is Two-Factor Authentication?</h3>
        <p className="text-gray-600">
          Two-factor authentication adds an extra layer of security to your account. In addition to your password, 
          you'll need to enter a verification code from an authenticator app on your phone when signing in.
        </p>
      </div>

      {!setupMode && !verifyMode && !showRecoveryKeys && (
        <div className="flex justify-center">
          {!is2FAEnabled ? (
            <button
              onClick={setupTwoFactor}
              disabled={loading}
              className="btn-ocean px-6 py-2 rounded-lg flex items-center"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin w-5 h-5 mr-2" />
                  Setting up...
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5 mr-2" />
                  Set Up Two-Factor Authentication
                </>
              )}
            </button>
          ) : (
            <button
              onClick={disableTwoFactor}
              disabled={loading}
              className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin w-5 h-5 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <XMarkIcon className="w-5 h-5 mr-2" />
                  Disable Two-Factor Authentication
                </>
              )}
            </button>
          )}
        </div>
      )}

      {setupMode && (
        <div className="space-y-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Step 1: Scan QR Code</h3>
            <p className="text-gray-600 mb-4">
              Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
            </p>
            <div className="flex justify-center p-4 bg-white">
              {qrCode ? (
                <QRCodeSVG value={qrCode} size={200} />
              ) : (
                <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-md"></div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">If you can't scan the QR code, enter this code manually:</p>
              <div className="p-2 bg-gray-100 rounded font-mono text-center select-all">
                {secret}
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Step 2: Verify Code</h3>
            <p className="text-gray-600 mb-4">
              Enter the 6-digit verification code from your authenticator app to verify setup.
            </p>
            <div className="flex space-x-4">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                placeholder="000000"
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-center text-xl tracking-widest"
                maxLength={6}
              />
              <button
                onClick={verifyAndEnableTwoFactor}
                disabled={loading || verificationCode.length !== 6}
                className="btn-ocean px-6 py-2 rounded-lg whitespace-nowrap flex items-center"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="animate-spin w-5 h-5 mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => {
                setSetupMode(false);
                setVerificationCode('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {verifyMode && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Verify Your Identity</h3>
          <p className="text-gray-600 mb-4">
            To disable two-factor authentication, please enter the 6-digit verification code from your authenticator app.
          </p>
          <div className="flex space-x-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
              placeholder="000000"
              className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-center text-xl tracking-widest"
              maxLength={6}
            />
            <button
              onClick={confirmDisableTwoFactor}
              disabled={loading || verificationCode.length !== 6}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap flex items-center"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin w-5 h-5 mr-2" />
                  Verifying...
                </>
              ) : (
                'Disable 2FA'
              )}
            </button>
          </div>
          <div className="flex justify-between mt-4">
            <button
              onClick={() => {
                setVerifyMode(false);
                setVerificationCode('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showRecoveryKeys && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Recovery Keys</h3>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-yellow-700">
              <strong>Important:</strong> Save these recovery keys in a secure location. They can be used to regain access to your account if you lose your authenticator device.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {recoveryKeys.map((key, index) => (
              <div key={index} className="p-2 bg-gray-100 rounded font-mono text-center select-all">
                {key}
              </div>
            ))}
          </div>
          <button
            onClick={handleRecoveryKeysSaved}
            className="w-full btn-ocean px-6 py-2 rounded-lg"
          >
            I've Saved My Recovery Keys
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;