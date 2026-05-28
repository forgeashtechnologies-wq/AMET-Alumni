import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { toFriendlyToast } from '../../utils/errors';
import { Cog6ToothIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

/**
 * AppSettings - Allows super admins to manage system-wide settings
 */
const AppSettings = () => {
  const { getUserRole } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const isSuperAdmin = getUserRole() === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSettings();
    }
  }, [isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;
      
      // Convert array to object with key-value pairs
      const settingsObj = {};
      data?.forEach(item => {
        settingsObj[item.key] = {
          id: item.id,
          value: item.value,
          description: item.description,
          type: item.type || 'text'
        };
      });
      
      setSettings(settingsObj);
    } catch (err) {
      logger.error('Error fetching settings:', err);
      toFriendlyToast(toast, err, 'Could not load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      setSaving(true);
      
      // Get the existing setting
      const setting = settings[key];
      if (!setting) return;
      
      const { error } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('id', setting.id);
        
      if (error) throw error;
      
      // Update local state
      setSettings(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          value
        }
      }));
      
      toast.success('Setting updated successfully');
    } catch (err) {
      logger.error('Error updating setting:', err);
      toFriendlyToast(toast, err, 'Could not update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }));
  };

  const handleSubmit = async (e, key) => {
    e.preventDefault();
    await updateSetting(key, settings[key].value);
  };

  const createTestSettings = async () => {
    if (!isSuperAdmin) return;
    
    try {
      setSaving(true);
      
      const defaultSettings = [
        { key: 'site_name', value: 'AMET Alumni Network', description: 'Name of the alumni site', type: 'text' },
        { key: 'site_description', value: 'Connect with fellow AMET alumni', description: 'Short description of the site', type: 'textarea' },
        { key: 'enable_registration', value: 'true', description: 'Allow new user registration', type: 'boolean' },
        { key: 'require_approval', value: 'true', description: 'Require admin approval for new accounts', type: 'boolean' },
        { key: 'auto_approve_amet_email', value: 'true', description: 'Auto-approve users with @amet.ac.in email', type: 'boolean' },
        { key: 'email_verification', value: 'true', description: 'Require email verification', type: 'boolean' },
        { key: 'max_file_size', value: '5', description: 'Maximum file upload size (MB)', type: 'number' },
        { key: 'primary_color', value: '#2563EB', description: 'Primary brand color', type: 'color' },
        { key: 'content_moderation', value: 'true', description: 'Enable content moderation', type: 'boolean' },
      ];
      
      const { error } = await supabase
        .from('app_settings')
        .insert(defaultSettings);
        
      if (error) throw error;
      
      toast.success('Default settings created');
      fetchSettings();
    } catch (err) {
      logger.error('Error creating settings:', err);
      toFriendlyToast(toast, err, 'Could not create settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Check if table exists
  const checkAndCreateTable = async () => {
    try {
      setSaving(true);
      
      // First check if the table exists
      const { data, error } = await supabase
        .from('app_settings')
        .select('count()', { count: 'exact' });
      
      if (error && error.code === '42P01') { // Table doesn't exist error code
        // Create the table
        await supabase.rpc('create_app_settings_table');
        toast.success('Settings table created');
        
        // Create default settings
        await createTestSettings();
      } else if (!error && data === 0) {
        // Table exists but empty
        await createTestSettings();
      } else if (error) {
        throw error;
      }
      
      fetchSettings();
    } catch (err) {
      logger.error('Error checking table:', err);
      toFriendlyToast(toast, err, 'Database error. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 p-8 rounded-lg shadow-md text-center">
        <div className="text-red-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800">Super Admin Access Required</h3>
        <p className="mt-2 text-sm text-red-700">
          You need Super Admin privileges to manage system settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-900">System Settings</h3>
            <p className="text-sm text-blue-700 mt-1">
              Configure system-wide settings and preferences for the AMET Alumni Platform
            </p>
          </div>
        </div>
      </div>

      {/* Settings Management */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading settings...</p>
        </div>
      ) : Object.keys(settings).length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No settings found in the database.</p>
            <button
              onClick={checkAndCreateTable}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Creating...' : 'Create Default Settings'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Application Settings</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Modify system behavior and appearance
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {Object.entries(settings).map(([key, setting]) => (
              <div key={key} className="px-4 py-5 sm:p-6">
                <form onSubmit={(e) => handleSubmit(e, key)}>
                  <div className="sm:flex sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                      <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-6 sm:flex-shrink-0">
                      {setting.type === 'boolean' ? (
                        <button
                          type="button"
                          onClick={() => updateSetting(key, setting.value === 'true' ? 'false' : 'true')}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${
                            setting.value === 'true' ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                              setting.value === 'true' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      ) : setting.type === 'textarea' ? (
                        <div className="w-full sm:w-64">
                          <textarea
                            value={setting.value}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            rows="3"
                          />
                        </div>
                      ) : setting.type === 'color' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={setting.value}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="h-8 w-8 rounded border-gray-300"
                          />
                          <span className="text-sm">{setting.value}</span>
                        </div>
                      ) : (
                        <div className="flex w-full sm:w-48">
                          <input
                            type={setting.type}
                            value={setting.value}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          <button
                            type="submit"
                            className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSettings;
