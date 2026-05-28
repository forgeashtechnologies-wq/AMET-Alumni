// frontend/src/components/Mentorship/MentorRegistrationForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { getMyMentorProfile, upsertMentor } from '../../services/mentors';
import logger from '../../utils/logger';
import { useNotification } from '../common/NotificationCenter';
import { useMentorshipRoleContext } from '../../hooks/useMentorshipRoleContext';
import {
  XMarkIcon,
  InformationCircleIcon,
  PlusIcon,
  ClockIcon,
  SparklesIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const MentorRegistrationForm = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { isStudent } = useMentorshipRoleContext();
  const [user, setUser] = useState(null);
  const [isNewMentor, setIsNewMentor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingMentorStatus, setExistingMentorStatus] = useState(null);
  const [currentTag, setCurrentTag] = useState('');

  const initialFormData = {
    mentoring_capacity_hours_per_month: '',
    expertise: [],
    mentoring_preferences: { communication: '', format: '', duration: '' },
    mentoring_experience_years: '',
    mentoring_statement: '',
    max_mentees: '',
    mentoring_experience_description: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!authUser) {
          notification.showError('You must be logged in to register as a mentor.');
          navigate('/login');
          return;
        }
        setUser(authUser);

        // Proceed with fetching mentor profile only if we have a user and haven't fetched before
        if (authUser.id && !hasFetchedRef.current) {
          setLoading(true);
          hasFetchedRef.current = true;

          const mentorProfile = await getMyMentorProfile();

          if (mentorProfile) {
            setExistingMentorStatus(mentorProfile.status);

            setFormData({
              mentoring_capacity_hours_per_month:
                mentorProfile.mentoring_capacity_hours_per_month || '',
              expertise: Array.isArray(mentorProfile.expertise)
                ? mentorProfile.expertise
                : [],
              mentoring_preferences:
                mentorProfile.mentoring_preferences || {
                  communication: '',
                  format: '',
                  duration: '',
                },
              mentoring_experience_years:
                mentorProfile.mentoring_experience_years || '',
              mentoring_statement: mentorProfile.mentoring_statement || '',
              max_mentees: mentorProfile.max_mentees || '',
              mentoring_experience_description:
                mentorProfile.mentoring_experience_description || '',
            });
          } else {
            setIsNewMentor(true);
          }
        }
      } catch (error) {
        logger.error('Error in fetchUserAndProfile:', error);
        notification.showError(`Failed to initialize form: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, [navigate, notification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (e) => {
    setCurrentTag(e.target.value);
  };

  const addTag = () => {
    const cleaned = currentTag.trim();
    if (cleaned && !formData.expertise.includes(cleaned)) {
      setFormData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, cleaned],
      }));
    }
    setCurrentTag('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      mentoring_preferences: { ...prev.mentoring_preferences, [name]: value },
    }));
  };

  const clearForm = () => {
    setFormData(initialFormData);
    notification.showSuccess('Form cleared. You can now enter new information.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      notification.showError('User session not found. Please log in again.');
      return;
    }

    // Validation
    if (
      !formData.mentoring_capacity_hours_per_month ||
      !formData.mentoring_experience_years ||
      !formData.mentoring_statement ||
      !formData.max_mentees ||
      formData.expertise.length === 0
    ) {
      notification.showError(
        'Please fill out all required fields, including at least one area of expertise.'
      );
      return;
    }

    setSaving(true);

    const parseNumeric = (val) =>
      val === '' || val === null ? null : parseInt(val, 10);

    const mentorData = {
      user_id: user.id,
      mentoring_capacity_hours_per_month: parseNumeric(
        formData.mentoring_capacity_hours_per_month
      ),
      expertise: formData.expertise,
      mentoring_preferences: formData.mentoring_preferences,
      mentoring_experience_years: parseNumeric(
        formData.mentoring_experience_years
      ),
      mentoring_statement: formData.mentoring_statement,
      max_mentees: parseNumeric(formData.max_mentees),
      mentoring_experience_description:
        formData.mentoring_experience_description || null,
      status: existingMentorStatus || 'pending',
    };

    try {
      const { data, error } = await upsertMentor(mentorData);

      if (error) {
        notification.showError(`Failed to save profile: ${error}`);
      } else {
        notification.showSuccess('Mentor details saved. Redirecting to My Mentorship...');
        if (isNewMentor) setIsNewMentor(false);
        if (data?.status) {
          setExistingMentorStatus(data.status);
        }
        setTimeout(() => navigate('/mentorship/me'), 800);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStatusPill = () => {
    if (!existingMentorStatus) return null;

    let bg = 'bg-yellow-100 text-yellow-800';
    let icon = '⏳';
    let label = 'Pending review';
    
    if (existingMentorStatus === 'approved') {
      bg = 'bg-green-100 text-green-800';
      icon = '✓';
      label = 'Approved';
    } else if (existingMentorStatus === 'rejected') {
      bg = 'bg-red-100 text-red-800';
      icon = '✕';
      label = 'Application rejected';
    }

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${bg}`}
        role="status"
        aria-label={`Mentor status: ${label}`}
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
    );
  };

  const renderStudentRestrictionCard = () => (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-red-100 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="text-2xl text-red-500 mt-1" aria-hidden="true">
            ⚠️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Students can’t register as trainers</h1>
            <p className="text-slate-600 mt-3 leading-relaxed">
              Trainer access is limited to alumni and employer accounts. Your profile can still request mentorship and
              participate as a trainee. Once you graduate or the admin team upgrades your role, you’ll be able to submit
              a trainer profile for approval.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Need your role updated? Contact the admin team or email support so we can verify your status.
            </p>
            <div className="mt-6">
              <Link
                to="/mentorship"
                className="inline-flex items-center justify-center rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
              >
                Back to mentorship hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isStudent) {
    return renderStudentRestrictionCard();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600" />
        <p className="mt-6 text-lg font-semibold text-gray-700">
          Loading your mentor profile...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full mx-auto">
        {/* Back link and Status */}
        <div className="mb-6">
          <Link
            to="/mentorship"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            <span>Back to Mentorship Hub</span>
          </Link>
          {existingMentorStatus && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Current status:</span>
              {renderStatusPill()}
            </div>
          )}
        </div>

        {isNewMentor && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-8 rounded-r-lg shadow">
            <div className="flex">
              <div className="py-1">
                <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-4" />
              </div>
              <div>
                <p className="font-bold">You haven’t created a mentor profile yet.</p>
                <p className="text-sm">
                  Fill out the form below to get started. You can always come back and
                  edit these details later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden p-8 mb-12">
          <div className="absolute inset-0 bg-black opacity-20" />
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <UserPlusIcon className="h-24 w-24 text-white opacity-80" />
            </div>
            <div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
                {isNewMentor ? 'Become a Mentor' : 'Edit Mentorship Details'}
              </h2>
              <p className="mt-3 text-xl text-indigo-100 max-w-3xl">
                {isNewMentor
                  ? 'This is your mentor profile. Mentees see this when browsing mentors. Your knowledge and experience are invaluable—join our community of mentors and make a lasting impact on the next generation of professionals.'
                  : 'This is your mentor profile that mentees see when browsing mentors. Keep it up to date so they see the right capacity, expertise, and how you prefer to mentor.'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1 */}
            <div className="space-y-8">
              {/* Section 1: Capacity & Availability */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-indigo-500">
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <ClockIcon className="w-8 h-8 text-indigo-500" />
                    <h3 className="text-2xl font-bold text-gray-800">Capacity & Availability</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-12">
                    Set how many hours per month you can dedicate and how many mentees you can support.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="mentoring_capacity_hours_per_month"
                      className="form-label"
                    >
                      Capacity (Hours/Month) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="mentoring_capacity_hours_per_month"
                      id="mentoring_capacity_hours_per_month"
                      value={formData.mentoring_capacity_hours_per_month}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div>
                    <label htmlFor="max_mentees" className="form-label">
                      Max. Mentees <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="max_mentees"
                      id="max_mentees"
                      value={formData.max_mentees}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="e.g., 2"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Expertise */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-purple-500">
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <SparklesIcon className="w-8 h-8 text-purple-500" />
                    <h3 className="text-2xl font-bold text-gray-800">Your Expertise</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-12">
                    Add skills and topics you can mentor in. Mentees will see these when browsing.
                  </p>
                </div>
                <div>
                  <label htmlFor="expertise_tags" className="form-label">
                    Areas of Expertise <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      id="expertise_tags"
                      value={currentTag}
                      onChange={handleTagChange}
                      onKeyDown={handleTagKeyDown}
                      className="form-input flex-grow"
                      placeholder="Type a skill and press Enter"
                      aria-label="Add an area of expertise"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="btn-secondary p-2.5"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.expertise.map((tag, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-2 bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1.5 rounded-full shadow-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-purple-500 hover:text-purple-700 transition-colors"
                          aria-label={`Remove ${tag}`}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {formData.expertise.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Please add at least one area of expertise.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-8">
              {/* Section 3: Experience & Statement */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-sky-500">
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <BriefcaseIcon className="w-8 h-8 text-sky-500" />
                    <h3 className="text-2xl font-bold text-gray-800">Experience & Statement</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-12">
                    Share your mentoring background and what mentees can expect from you.
                  </p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="mentoring_experience_years"
                      className="form-label"
                    >
                      Years of Mentoring Experience{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="mentoring_experience_years"
                      id="mentoring_experience_years"
                      value={formData.mentoring_experience_years}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="e.g., 3"
                    />
                  </div>
                  <div>
                    <label htmlFor="mentoring_statement" className="form-label">
                      Brief Mentoring Statement{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="mentoring_statement"
                      id="mentoring_statement"
                      rows="4"
                      value={formData.mentoring_statement}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="What can mentees expect from you?"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mentoring_experience_description"
                      className="form-label"
                    >
                      Describe Your Mentoring Experience (Optional)
                    </label>
                    <textarea
                      name="mentoring_experience_description"
                      id="mentoring_experience_description"
                      rows="4"
                      value={formData.mentoring_experience_description}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Briefly describe your past mentoring roles..."
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Preferences */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-teal-500">
                <div className="flex items-center gap-4 mb-6">
                  <Cog6ToothIcon className="w-8 h-8 text-teal-500" />
                  <h3 className="text-2xl font-bold text-gray-800">
                    Mentoring Preferences
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="communication" className="form-label">
                      Communication <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="communication"
                      id="communication"
                      value={formData.mentoring_preferences.communication}
                      onChange={handlePreferenceChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select a method</option>
                      <option value="Email">Email</option>
                      <option value="Slack/Teams">Slack/Teams</option>
                      <option value="Video Call">Video Call</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="In-person">In-person</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="format" className="form-label">
                      Format <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="format"
                      id="format"
                      value={formData.mentoring_preferences.format}
                      onChange={handlePreferenceChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select a format</option>
                      <option value="1-on-1 Sessions">1-on-1 Sessions</option>
                      <option value="Group Mentoring">Group Mentoring</option>
                      <option value="Project Collaboration">Project Collaboration</option>
                      <option value="Informal Check-ins">Informal Check-ins</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="duration" className="form-label">
                      Duration <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="duration"
                      id="duration"
                      value={formData.mentoring_preferences.duration}
                      onChange={handlePreferenceChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select a duration</option>
                      <option value="1-3 Months">1-3 Months</option>
                      <option value="3-6 Months">3-6 Months</option>
                      <option value="6-12 Months">6-12 Months</option>
                      <option value="Ongoing">Ongoing</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={clearForm}
              disabled={saving || loading}
              className="btn-secondary-outline text-lg px-8 py-3"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="btn-primary text-lg px-8 py-3 w-full sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save Mentor Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MentorRegistrationForm;
