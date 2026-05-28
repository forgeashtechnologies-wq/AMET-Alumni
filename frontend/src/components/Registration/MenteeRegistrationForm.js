import logger from '../../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

export default function MenteeRegistrationForm() {
  const [formData, setFormData] = useState({
    career_goals: '',
    areas_seeking_mentorship: [],
    specific_skills_to_develop: [],
    preferred_mentor_characteristics: [],
    time_commitment_available: '',
    preferred_communication_method: [],
    statement_of_expectations: ''
  });
  const [loading, setLoading] = useState(true); // Start with loading state while checking mentee status
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isExistingMentee, setIsExistingMentee] = useState(false);
  
  // Use refs to keep track of Supabase listeners to avoid duplicates
  const menteeListener = useRef(null);

  // Check if user is already a mentee on component mount
  useEffect(() => {
    const checkMenteeStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Fetch mentee data and pre-fill form if exists
        const { data, error } = await supabase
          .from('mentee_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is not found error
          logger.error('Error fetching mentee data:', error);
        }
        
        if (data) {
          setIsExistingMentee(true);
          setFormData({
            career_goals: data.career_goals || '',
            areas_seeking_mentorship: data.areas_seeking_mentorship || [],
            specific_skills_to_develop: data.specific_skills_to_develop || [],
            preferred_mentor_characteristics: data.preferred_mentor_characteristics || [],
            time_commitment_available: data.time_commitment_available || '',
            preferred_communication_method: data.preferred_communication_method || [],
            statement_of_expectations: data.statement_of_expectations || ''
          });
        }
      } catch (err) {
        logger.error('Error checking mentee status:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkMenteeStatus();
    
    // Cleanup function to remove any Supabase listeners when component unmounts
    return () => {
      if (menteeListener.current) {
        menteeListener.current.unsubscribe();
      }
    };
  }, []);

  // Handle text field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle array field changes (comma-separated values)
  const handleArrayChange = (e) => {
    const { name, value } = e.target;
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item !== '');
    setFormData(prev => ({
      ...prev,
      [name]: arrayValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('mentee_profiles')
        .upsert([
          {
            user_id: user.id,
            ...formData
          }
        ]);
        
      if (error) throw error;
      
      // Show success notification
      if (isExistingMentee) {
        toast.success('Mentee profile updated successfully!');
      } else {
        toast.success('Mentee profile created successfully!');
        setIsExistingMentee(true);
      }
      
      setSuccess(true);
      
      // Reset success after a delay
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      setError(error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {isExistingMentee ? 'Edit Mentee Details' : 'Mentee Registration'}
      </h2>
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : success ? (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {isExistingMentee ? 'Mentee profile updated successfully!' : 'Registration successful!'}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="career_goals">
              Career Goals
            </label>
            <textarea
              id="career_goals"
              name="career_goals"
              value={formData.career_goals}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="areas_seeking_mentorship">
              Areas Seeking Mentorship (comma-separated)
            </label>
            <textarea
              id="areas_seeking_mentorship"
              name="areas_seeking_mentorship"
              value={formData.areas_seeking_mentorship.join(', ')}
              onChange={handleArrayChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
              placeholder="E.g. Career advancement, Technical skills, Leadership"
            ></textarea>
            <p className="text-sm text-gray-500 mt-1">Enter multiple items separated by commas</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="specific_skills_to_develop">
              Specific Skills to Develop (comma-separated)
            </label>
            <textarea
              id="specific_skills_to_develop"
              name="specific_skills_to_develop"
              value={formData.specific_skills_to_develop.join(', ')}
              onChange={handleArrayChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
              placeholder="E.g. Project management, Public speaking, Data analysis"
            ></textarea>
            <p className="text-sm text-gray-500 mt-1">Enter multiple skills separated by commas</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="preferred_mentor_characteristics">
              Preferred Mentor Characteristics (comma-separated)
            </label>
            <textarea
              id="preferred_mentor_characteristics"
              name="preferred_mentor_characteristics"
              value={formData.preferred_mentor_characteristics.join(', ')}
              onChange={handleArrayChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
              placeholder="E.g. Industry experience, Communication style, Background"
            ></textarea>
            <p className="text-sm text-gray-500 mt-1">Enter multiple characteristics separated by commas</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="time_commitment_available">
              Time Commitment Available
            </label>
            <select
              id="time_commitment_available"
              name="time_commitment_available"
              value={formData.time_commitment_available}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select time commitment</option>
              <option value="1hr/week">1 hour per week</option>
              <option value="2hrs/week">2 hours per week</option>
              <option value="3-5hrs/week">3-5 hours per week</option>
              <option value="5-10hrs/month">5-10 hours per month</option>
              <option value="As needed">As needed</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="preferred_communication_method">
              Preferred Communication Methods (comma-separated)
            </label>
            <textarea
              id="preferred_communication_method"
              name="preferred_communication_method"
              value={formData.preferred_communication_method.join(', ')}
              onChange={handleArrayChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E.g. Email, Video calls, Chat"
              required
            ></textarea>
            <p className="text-sm text-gray-500 mt-1">Enter multiple methods separated by commas</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="statement_of_expectations">
              Brief Statement of Expectations
            </label>
            <textarea
              id="statement_of_expectations"
              name="statement_of_expectations"
              value={formData.statement_of_expectations}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            ></textarea>
          </div>
          
          {error && (
            <div className="mb-4 text-red-500">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200"
            disabled={loading}
          >
            {loading ? 'Processing...' : isExistingMentee ? 'Update Mentee Details' : 'Register as Mentee'}
          </button>
        </form>
      )}
    </div>
  );
}
