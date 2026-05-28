import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useNotification } from '../common/NotificationCenter';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

const MenteeRegistrationForm = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const initialFormData = {
    career_goals: '',
    areas_seeking_mentorship: [],
    specific_skills_to_develop: [],
    preferred_mentor_characteristics: '',
    time_commitment_available: '',
    preferred_communication_method: '',
    statement_of_expectations: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [currentAreaTag, setCurrentAreaTag] = useState('');
  const [currentSkillTag, setCurrentSkillTag] = useState('');

  const fetchUserAndProfile = useCallback(async (sessionUser) => {
    try {
      const { data: menteeProfile, error } = await supabase
        .from('mentee_profiles')
        .select('*')
        .eq('user_id', sessionUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore 'no rows found' error

      if (menteeProfile) {
        setFormData({
          ...initialFormData,
          ...menteeProfile,
          areas_seeking_mentorship: Array.isArray(menteeProfile.areas_seeking_mentorship) ? menteeProfile.areas_seeking_mentorship : [],
          specific_skills_to_develop: Array.isArray(menteeProfile.specific_skills_to_develop) ? menteeProfile.specific_skills_to_develop : [],
        });
        notification.showSuccess('Existing mentee profile loaded for editing.');
      }
    } catch (error) {
      notification.showError(`Failed to load mentee profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { state: { from: '/register-mentee' } });
        notification.showWarning('You must be logged in to register as a mentee.');
      } else {
        setUser(session.user);
        fetchUserAndProfile(session.user);
      }
    };
    checkSession();
  }, [navigate, notification, fetchUserAndProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagInput = (type, value, setValue, addTag) => {
    setValue(value);
    if (value.endsWith(',')) {
      addTag(type, value.slice(0, -1));
      setValue('');
    }
  };

  const addTag = (type, tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData[type].includes(trimmedTag)) {
      setFormData(prev => ({ ...prev, [type]: [...prev[type], trimmedTag] }));
    }
  };

  const removeTag = (type, tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      [type]: formData[type].filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      notification.showError('User session not found. Please log in again.');
      return;
    }

    if (formData.areas_seeking_mentorship.length === 0 || formData.specific_skills_to_develop.length === 0) {
      notification.showError('Please add at least one area of mentorship and one skill to develop.');
      return;
    }

    setSaving(true);

    const profileData = {
      ...formData,
      user_id: user.id,
      time_commitment_available: formData.time_commitment_available ? parseInt(formData.time_commitment_available, 10) : null,
    };

    try {
      const { error } = await supabase
        .from('mentee_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      notification.showSuccess('Mentee profile saved successfully!');
      navigate('/dashboard');
    } catch (error) {
      notification.showError(`Failed to save profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading form...</p></div>;
  }

  const renderTagInput = (label, type, value, setValue, addTag) => (
    <div>
      <label className="form-label">{label} <span className="text-red-500">*</span></label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={value}
          onChange={(e) => handleTagInput(type, e.target.value, setValue, addTag)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(type, value);
              setValue('');
            }
          }}
          className="form-input flex-grow"
          placeholder="Type and press Enter or comma"
        />
        <button type="button" onClick={() => { addTag(type, value); setValue(''); }} className="btn-secondary p-2.5">
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {formData[type].map((tag, index) => (
          <span key={index} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(type, tag)} className="text-blue-500 hover:text-blue-700">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="form-title">Mentee Registration</h1>
        <p className="form-subtitle">Share your goals and preferences to find the right mentor.</p>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="career_goals" className="form-label">Career Goals</label>
              <textarea id="career_goals" name="career_goals" value={formData.career_goals} onChange={handleChange} rows="4" className="form-input" placeholder="Describe your short-term and long-term career aspirations."></textarea>
            </div>

            {renderTagInput('Areas Seeking Mentorship', 'areas_seeking_mentorship', currentAreaTag, setCurrentAreaTag, addTag)}
            {renderTagInput('Specific Skills to Develop', 'specific_skills_to_develop', currentSkillTag, setCurrentSkillTag, addTag)}

            <div>
              <label htmlFor="preferred_mentor_characteristics" className="form-label">Preferred Mentor Characteristics</label>
              <input type="text" id="preferred_mentor_characteristics" name="preferred_mentor_characteristics" value={formData.preferred_mentor_characteristics} onChange={handleChange} className="form-input" placeholder="e.g., Industry, experience, communication style"/>
            </div>

            <div>
              <label htmlFor="time_commitment_available" className="form-label">Time Commitment (hours/week)</label>
              <input type="number" id="time_commitment_available" name="time_commitment_available" value={formData.time_commitment_available} onChange={handleChange} className="form-input" placeholder="e.g., 2"/>
            </div>

            <div>
              <label htmlFor="preferred_communication_method" className="form-label">Preferred Communication Method</label>
              <select id="preferred_communication_method" name="preferred_communication_method" value={formData.preferred_communication_method} onChange={handleChange} className="form-input">
                <option value="">Select a method</option>
                <option value="video_call">Video Call</option>
                <option value="email">Email</option>
                <option value="messaging">Messaging App</option>
                <option value="in_person">In-person</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="statement_of_expectations" className="form-label">Statement of Expectations</label>
              <textarea id="statement_of_expectations" name="statement_of_expectations" value={formData.statement_of_expectations} onChange={handleChange} rows="4" className="form-input" placeholder="What do you hope to gain from this mentorship?"></textarea>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Link to="/dashboard" className="btn-secondary mr-4">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenteeRegistrationForm;
