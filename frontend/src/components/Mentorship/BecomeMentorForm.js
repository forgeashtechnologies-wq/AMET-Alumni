import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';

const BecomeMentorForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingMentor, setExistingMentor] = useState(null);
  const [formData, setFormData] = useState({
    mentoring_statement: '',
    expertise: [],
    max_mentees: 3,
    mentoring_experience_years: 0,
    availability: [],
    preferences: [],
  });
  const [errors, setErrors] = useState({});

  const expertiseOptions = [
    'Marine Engineering',
    'Naval Architecture',
    'Port Management',
    'Maritime Law',
    'Ship Operations',
    'Logistics',
    'Research & Development',
    'Leadership',
    'Career Guidance',
    'Technical Skills',
    'Industry Connections'
  ];

  const availabilityOptions = [
    'Weekday Mornings',
    'Weekday Afternoons',
    'Weekday Evenings',
    'Weekend Mornings',
    'Weekend Afternoons',
    'Weekend Evenings'
  ];

  const preferenceOptions = [
    'One-on-One Sessions',
    'Group Sessions',
    'Email Correspondence',
    'Video Calls',
    'In-Person Meetings',
    'Project-based Mentoring'
  ];

  useEffect(() => {
    if (user) {
      checkExistingMentor();
    }
  }, [user]);

  const checkExistingMentor = async () => {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is not found error
        logger.error('Error checking mentor status:', error);
        toast.error('Error checking your mentor status');
        return;
      }

      if (data) {
        setExistingMentor(data);
        // Populate form with existing data
        setFormData({
          mentoring_statement: data.mentoring_statement || '',
          expertise: data.expertise || [],
          max_mentees: data.max_mentees || 3,
          mentoring_experience_years: data.mentoring_experience_years || 0,
          availability: data.availability || [],
          preferences: data.preferences || [],
        });
        logger.log('Existing mentor data loaded:', data);
      }
    } catch (err) {
      logger.error('Error checking mentor status:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleCheckboxChange = (e, field) => {
    const value = e.target.value;
    const isChecked = e.target.checked;

    setFormData(prev => {
      const currentValues = [...prev[field]];
      if (isChecked && !currentValues.includes(value)) {
        return { ...prev, [field]: [...currentValues, value] };
      } else if (!isChecked && currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter(item => item !== value) };
      }
      return prev;
    });

    // Clear error when field is edited
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.mentoring_statement.trim()) {
      newErrors.mentoring_statement = 'Mentoring statement is required';
    } else if (formData.mentoring_statement.length < 50) {
      newErrors.mentoring_statement = 'Mentoring statement should be at least 50 characters';
    }

    if (formData.expertise.length === 0) {
      newErrors.expertise = 'Please select at least one area of expertise';
    }

    if (formData.availability.length === 0) {
      newErrors.availability = 'Please select at least one availability option';
    }

    if (formData.preferences.length === 0) {
      newErrors.preferences = 'Please select at least one mentoring preference';
    }

    if (formData.mentoring_experience_years < 0) {
      newErrors.mentoring_experience_years = 'Experience years cannot be negative';
    }

    if (formData.max_mentees < 1 || formData.max_mentees > 10) {
      newErrors.max_mentees = 'Maximum mentees must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to become a mentor');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(existingMentor ? 'Updating mentor profile...' : 'Creating mentor profile...');

    try {
      // Use secure RPC: create_or_update_mentor_profile
      const { data, error } = await supabase.rpc('create_or_update_mentor_profile', {
        p_expertise: formData.expertise || [],
        p_mentoring_statement: formData.mentoring_statement || null,
        p_max_mentees: formData.max_mentees ?? null,
        // Backend expects a simple text; join array selections as a comma separated string for now
        p_availability: (formData.availability && formData.availability.length > 0)
          ? formData.availability.join(', ')
          : null,
      });

      if (error) {
        logger.error('Error saving mentor profile via RPC:', error);
        toast.error(`Error: ${error.message}`, { id: toastId });
        return;
      }

      toast.success(
        existingMentor ?
          'Mentor profile updated successfully!' :
          'Mentor profile created successfully! Your application is pending approval.',
        { id: toastId }
      );

      // Navigate after a short delay to allow the user to see the success message
      setTimeout(() => navigate('/mentorship'), 1500);
    } catch (error) {
      logger.error('Error in mentor profile submission:', error);
      toast.error(`An unexpected error occurred: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="glass-card p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {existingMentor ? 'Update Mentor Profile' : 'Become a Mentor'}
        </h1>
        <p className="text-gray-600 mb-6">
          {existingMentor ? 
            'Update your mentorship details below' : 
            'Share your expertise and help fellow alumni advance their careers'}
        </p>
        
        {existingMentor?.status === 'pending' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your mentor application is currently under review. You can update your information while waiting for approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {existingMentor?.status === 'rejected' && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Your previous mentor application was not approved. Please update your information and reapply.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mentoring Statement */}
          <div>
            <label htmlFor="mentoring_statement" className="block text-sm font-medium text-gray-700 mb-1">
              Mentoring Statement <span className="text-red-500">*</span>
            </label>
            <textarea
              id="mentoring_statement"
              name="mentoring_statement"
              value={formData.mentoring_statement}
              onChange={handleInputChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-md ${errors.mentoring_statement ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Describe why you want to be a mentor, your relevant experience, and what you hope to offer mentees..."
              disabled={loading}
            />
            {errors.mentoring_statement && (
              <p className="text-red-500 text-sm mt-1">{errors.mentoring_statement}</p>
            )}
            <p className="text-gray-500 text-sm mt-1">
              Min 50 characters. Be specific about how you can help mentees grow professionally.
            </p>
          </div>

          {/* Expertise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Areas of Expertise <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {expertiseOptions.map((option) => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`expertise-${option}`}
                    value={option}
                    checked={formData.expertise.includes(option)}
                    onChange={(e) => handleCheckboxChange(e, 'expertise')}
                    className="h-4 w-4 text-ocean-600 border-gray-300 rounded focus:ring-ocean-500"
                    disabled={loading}
                  />
                  <label htmlFor={`expertise-${option}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {errors.expertise && (
              <p className="text-red-500 text-sm mt-1">{errors.expertise}</p>
            )}
          </div>

          {/* Experience and Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mentoring Experience Years */}
            <div>
              <label htmlFor="mentoring_experience_years" className="block text-sm font-medium text-gray-700 mb-1">
                Years of Mentoring Experience
              </label>
              <input
                type="number"
                id="mentoring_experience_years"
                name="mentoring_experience_years"
                value={formData.mentoring_experience_years}
                onChange={handleInputChange}
                min="0"
                max="50"
                className={`w-full px-3 py-2 border rounded-md ${errors.mentoring_experience_years ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.mentoring_experience_years && (
                <p className="text-red-500 text-sm mt-1">{errors.mentoring_experience_years}</p>
              )}
            </div>

            {/* Max Mentees */}
            <div>
              <label htmlFor="max_mentees" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Number of Mentees
              </label>
              <input
                type="number"
                id="max_mentees"
                name="max_mentees"
                value={formData.max_mentees}
                onChange={handleInputChange}
                min="1"
                max="10"
                className={`w-full px-3 py-2 border rounded-md ${errors.max_mentees ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {errors.max_mentees && (
                <p className="text-red-500 text-sm mt-1">{errors.max_mentees}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                This is the maximum number of mentees you're willing to mentor simultaneously.
              </p>
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {availabilityOptions.map((option) => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`availability-${option}`}
                    value={option}
                    checked={formData.availability.includes(option)}
                    onChange={(e) => handleCheckboxChange(e, 'availability')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <label htmlFor={`availability-${option}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {errors.availability && (
              <p className="text-red-500 text-sm mt-1">{errors.availability}</p>
            )}
          </div>

          {/* Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mentoring Preferences <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {preferenceOptions.map((option) => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`preference-${option}`}
                    value={option}
                    checked={formData.preferences.includes(option)}
                    onChange={(e) => handleCheckboxChange(e, 'preferences')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={loading}
                  />
                  <label htmlFor={`preference-${option}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {errors.preferences && (
              <p className="text-red-500 text-sm mt-1">{errors.preferences}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/mentorship')}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border-2 border-ocean-600 text-ocean-600 hover:bg-ocean-600 hover:text-white transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              disabled={loading}
            >
              {loading ? 'Submitting...' : existingMentor ? 'Update Profile' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BecomeMentorForm;
