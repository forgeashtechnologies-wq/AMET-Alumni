import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../common/NotificationCenter';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';
import { 
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
  fetchJobAlerts,
} from '../../services/jobService';
import { 
  BellIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  BriefcaseIcon,
  CurrencyRupeeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const JOB_TYPE_MAP = {
  'any': null,
  'full-time': 'full-time',
  'part-time': 'part-time',
  'contract': 'contract',
  'internship': 'internship',
};

const FREQ_MAP = {
  'daily': 'daily',
  'weekly': 'weekly',
  'biweekly': 'biweekly',
  'monthly': 'monthly',
};

const EXP_MAP = {
  'any': null,
  'entry': 'entry',
  'mid': 'mid',
  'senior': 'senior',
  'lead': 'lead',
};

const JobAlerts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);


  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({
    alert_name: '',
    keywords: '',
    location: '',
    job_type: 'any',
    experience_level: 'any',
    min_salary: null,
    max_salary: null,
    frequency: 'weekly',
    is_active: true
  });

  const jobTypes = [
    { value: 'any', label: 'Any Job Type' },
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' }
  ];

  const experienceLevels = [
    { value: 'any', label: 'Any Experience Level' },
    { value: 'entry', label: 'Entry Level (0-2 years)' },
    { value: 'mid', label: 'Mid Level (3-7 years)' },
    { value: 'senior', label: 'Senior Level (8+ years)' }
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for alert_name to ensure it's never empty
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setFetchError(null);
      logger.log('Fetching job alerts for user ID:', user.id);

      const result = await fetchJobAlerts(user.id);
      if (!result.success) {
        setFetchError(result.error || 'Unable to load alerts.');
        showError(result.error || 'Unable to load your job alerts.');
        setAlerts([]);
        return;
      }

      setAlerts(result.data || []);
    } catch (error) {
      logger.error('Error fetching job alerts:', error);
      setFetchError(error?.message || 'Could not fetch job alerts.');
      showError(`Could not fetch your job alerts: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showError('You must be logged in to manage alerts.');
      return;
    }

    // --- Improved Validation ---
    const alertName = formData.alert_name.trim();
    if (!alertName) {
      showError('Alert name cannot be empty.');
      return;
    }

    // Map UI values to DB tokens
    const job_type = JOB_TYPE_MAP[formData.job_type] ?? null;
    const experience_level = EXP_MAP[formData.experience_level] ?? null;
    const frequency = FREQ_MAP[formData.frequency] ?? null;
    const min_salary_num = formData.min_salary ? Number(formData.min_salary) : null;
    const max_salary_num = formData.max_salary ? Number(formData.max_salary) : null;

    // Validate salary range
    if (min_salary_num && max_salary_num && min_salary_num > max_salary_num) {
      showError('Min salary cannot be greater than max salary');
      return;
    }

    let keywordsArr = Array.isArray(formData.keywords)
      ? formData.keywords
      : (formData.keywords || '')
          .split(',')
          .map(k => k.trim())
          .filter(Boolean);

    // Enforce max 50 keywords client-side to align with DB constraint
    if (keywordsArr.length > 50) {
      keywordsArr = keywordsArr.slice(0, 50);
      showError('You can specify at most 50 keywords per alert. Extra keywords have been ignored.');
    }

    const alertData = {
      alert_name: alertName,
      keywords: keywordsArr,
      location: formData.location || '',
      // Only include non-null values
      ...(job_type ? { job_type } : {}),
      ...(experience_level ? { experience_level } : {}),
      ...(min_salary_num !== null ? { min_salary: min_salary_num } : {}),
      ...(max_salary_num !== null ? { max_salary: max_salary_num } : {}),
      ...(frequency ? { frequency } : {}),
      is_active: formData.is_active === undefined ? true : Boolean(formData.is_active),
    };

    try {
      setSubmitting(true);
      const result = editingAlert
        ? await updateJobAlert(editingAlert.id, alertData)
        : await createJobAlert(alertData);

      if (!result.success) {
        showError(result.error || 'Unable to save alert.');
        return;
      }

      showSuccess(editingAlert ? 'Job alert updated successfully!' : 'Job alert created successfully!');
      await fetchAlerts();
      setShowCreateForm(false);
      setEditingAlert(null);
    } catch (error) {
      logger.error('Error submitting job alert:', error);
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }

  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      alert_name: alert.alert_name || '',
      keywords: Array.isArray(alert.keywords) ? alert.keywords.join(', ') : '',
      location: alert.location || '',
      job_type: alert.job_type || 'any',
      experience_level: alert.experience_level || 'any',
      min_salary: alert.min_salary || null,
      max_salary: alert.max_salary || null,
      frequency: alert.frequency || 'weekly',
      is_active: alert.is_active
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;

    try {
      setDeletingId(alertId);
      const result = await deleteJobAlert(alertId);
      if (!result.success) throw new Error(result.error);

      showSuccess('Job alert deleted successfully!');
      await fetchAlerts();
    } catch (error) {
      showError(`Error deleting alert: ${error.message}`);
      logger.error('Error deleting job alert:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleAlert = async (alert) => {
    // Validate the alert has an ID before proceeding
    if (!alert || !alert.id) {
      logger.error('Cannot toggle alert: Missing alert ID', alert);
      showError('Could not update this alert: Missing identifier');
      return;
    }

    try {
      setTogglingId(alert.id);
      const result = await updateJobAlert(alert.id, { is_active: !alert.is_active });
      if (!result.success) throw new Error(result.error);

      showSuccess(`Alert "${alert.alert_name}" has been ${!alert.is_active ? 'activated' : 'deactivated'}.`);
      await fetchAlerts();
    } catch (error) {
      showError(`Error updating alert status: ${error.message}`);
      logger.error('Error toggling alert:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const getFrequencyBadgeColor = (frequency) => {
    switch (frequency) {
      case 'daily': return 'bg-green-100 text-green-800';
      case 'weekly': return 'bg-blue-100 text-blue-800';
      case 'biweekly': return 'bg-purple-100 text-purple-800';
      case 'monthly': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Alerts</h1>
            <p className="text-gray-600">
              Get notified when new jobs matching your criteria are posted
            </p>
            <p className="text-sm text-gray-500">{alerts.length}/10 alerts used</p>
          </div>
          </div>
          <button
            onClick={() => {
              // Reset form with explicit values to ensure nothing is null/undefined
              const initialFormState = {
                alert_name: '',
                keywords: '',
                location: '',
                job_type: 'any',
                experience_level: 'any',
                min_salary: null,
                max_salary: null,
                frequency: 'weekly',
                is_active: true
              };
              
              // Reset form to initial state
              setEditingAlert(null);
              setFormData(initialFormState);
              setShowCreateForm(true);
            }}
            className="btn-ocean px-4 py-2 rounded-lg flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={alerts.length >= 10}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Alert
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-ocean-600">
            {alerts.filter(alert => alert.is_active).length}
          </div>
          <div className="text-sm text-gray-600">Active Alerts</div>
        </div>
        <div className="glass-card rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-green-600">–</div>
          <div className="text-sm text-gray-600">Jobs Found This Week (coming soon)</div>
        </div>
        <div className="glass-card rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {alerts.filter(alert => alert.last_sent_at).length}
          </div>
          <div className="text-sm text-gray-600">Alerts Sent</div>
        </div>
      </div>

      {/* Limit banner */}
      {alerts.length >= 10 && (
        <div className="glass-card border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4">
          <div className="font-semibold">Alert limit reached</div>
          <div className="text-sm">You can keep up to 10 job alerts. Delete or pause one to create another.</div>
        </div>
      )}

      {/* Conditional Rendering: Show Form or List */}
      {showCreateForm ? (
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingAlert ? 'Edit Job Alert' : 'Create Job Alert'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form fields... */}
          </form>
        </div>
      ) : (
        <div className="glass-card rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Job Alerts</h2>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : fetchError ? (
            <div className="text-center py-12">
              <div className="text-red-600 font-semibold mb-2">Could not load your alerts.</div>
              <div className="text-sm text-gray-600 mb-4">{fetchError}</div>
              <button
                onClick={fetchAlerts}
                className="btn-ocean px-4 py-2 rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No job alerts yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first job alert to get notified about relevant opportunities.
              </p>
              <button
                onClick={() => {
                  setEditingAlert(null);
                  setFormData({
                    alert_name: '',
                    keywords: '',
                    location: '',
                    job_type: 'any',
                    experience_level: 'any',
                    min_salary: null,
                    max_salary: null,
                    frequency: 'weekly',
                    is_active: true
                  });
                  setShowCreateForm(true);
                }}
                className="btn-ocean px-4 py-2 rounded-lg"
              >
                Create Your First Alert
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-6 hover:bg-ocean-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{alert.alert_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyBadgeColor(alert.frequency)}`}>
                          {alert.frequency}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3 text-sm">
                        <div className="flex items-center">
                          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Keywords:</span>
                          <span className="ml-1 font-medium">{Array.isArray(alert.keywords) ? alert.keywords.join(', ') : ''}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Location:</span>
                          <span className="ml-1 font-medium">{alert.location}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <BriefcaseIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-1 font-medium">{alert.job_type}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Experience:</span>
                          <span className="ml-1 font-medium">{alert.experience_level}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span>Created: {new Date(alert.created_at).toLocaleDateString()}</span>
                        {alert.last_sent_at && (
                          <span>Last sent: {new Date(alert.last_sent_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.is_active}
                          onChange={() => toggleAlert(alert)}
                          className="sr-only peer"
                          disabled={togglingId === alert.id}
                        />
                        <div className={`w-11 h-6 rounded-full ${alert.is_active ? 'bg-ocean-500' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-ocean-300 ${togglingId === alert.id ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <div className={`absolute left-[2px] top-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ${alert.is_active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                      </label>
                      
                      <button
                        onClick={() => handleEdit(alert)}
                        className="p-2 text-gray-400 hover:text-ocean-600 rounded-lg hover:bg-ocean-100"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(alert.id)}
                        disabled={deletingId === alert.id}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAlert ? 'Edit Job Alert' : 'Create Job Alert'}
              </h2>
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingAlert(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Title *
                </label>
                <input
                  type="text"
                  name="alert_name"
                  value={formData.alert_name || ''}
                  onChange={handleInputChange}
                  required
                  autoFocus
                  className="form-input w-full px-3 py-2 rounded-lg border-2 border-ocean-500"
                  placeholder="e.g., Senior Marine Engineer Jobs"
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      showError('Alert name cannot be empty');
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords *
                </label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  required
                  className="form-input w-full px-3 py-2 rounded-lg"
                  placeholder="e.g., Marine Engineer, Chief Engineer, Ship Operations"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple keywords with commas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 rounded-lg"
                    placeholder="e.g., Mumbai, Chennai or leave empty for all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type
                  </label>
                  <select
                    name="job_type"
                    value={formData.job_type}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 rounded-lg"
                  >
                    {jobTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  name="experience_level"
                  value={formData.experience_level}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 rounded-lg"
                >
                  {experienceLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Range (Optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    name="min_salary"
                    value={formData.min_salary || ''}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 rounded-lg"
                    placeholder="Min (₹ LPA)"
                  />
                  <input
                    type="number"
                    name="max_salary"
                    value={formData.max_salary || ''}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 rounded-lg"
                    placeholder="Max (₹ LPA)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Frequency
                </label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 rounded-lg"
                >
                  {frequencies.map(freq => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">
                  Activate this alert immediately
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAlert(null);
                  }}
                  className="btn-ocean-outline px-6 py-2 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-ocean px-6 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingAlert ? 'Update Alert' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="glass-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Tips for Better Job Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Keywords</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Use specific job titles for precise results</li>
              <li>• Include related terms (e.g., "Marine Engineer" + "Chief Engineer")</li>
              <li>• Try both acronyms and full terms</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Frequency</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Daily: For urgent job hunting</li>
              <li>• Weekly: Balanced frequency for most users</li>
              <li>• Monthly: For passive job seekers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobAlerts;