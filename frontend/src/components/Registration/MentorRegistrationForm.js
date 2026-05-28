import logger from '../../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { CircularProgress } from '@mui/material';

export default function MentorRegistrationForm() {
  const [formData, setFormData] = useState({
    mentoring_capacity_hours_per_month: '',
    areas_of_expertise: '',
    mentoring_preferences: '',
    mentoring_experience_years: '',
    mentoring_statement: '',
    max_mentees: '',
    session_details: '' // New field for session details
  });
  const [loading, setLoading] = useState(true); // Start with loading to check if mentor exists
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isExistingMentor, setIsExistingMentor] = useState(false);
  const subscriptionRef = useRef(null); // Store subscription to avoid duplicate listeners
  
  // Check if user is already a mentor and fetch their data if they are
  useEffect(() => {
    const checkMentorStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Clean up any existing subscription
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
        
        // Fetch mentor data
        const { data, error } = await supabase
          .from('mentors')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is not found error
          throw error;
        }
        
        if (data) {
          setIsExistingMentor(true);
          // Pre-fill form with existing data
          setFormData({
            mentoring_capacity_hours_per_month: data.mentoring_capacity_hours_per_month || '',
            areas_of_expertise: data.areas_of_expertise || '',
            mentoring_preferences: data.mentoring_preferences || '',
            mentoring_experience_years: data.mentoring_experience_years || '',
            mentoring_statement: data.mentoring_statement || '',
            max_mentees: data.max_mentees || '',
            session_details: data.session_details || '' 
          });
        }
      } catch (err) {
        logger.error('Error checking mentor status:', err);
        setError('Failed to check mentor status. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    checkMentorStatus();
    
    // Cleanup subscription when component unmounts
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        .from('mentors')
        .upsert([
          {
            user_id: user.id,
            ...formData
          }
        ]);
        
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking mentor status
  if (loading && !isExistingMentor && !success) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress />
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {isExistingMentor ? 'Edit Mentorship Details' : 'Mentor Registration'}
      </h2>
      {success ? (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {isExistingMentor ? 'Mentorship details updated successfully!' : 'Registration successful!'}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="mentoring_capacity_hours_per_month">
              Mentoring Capacity (hours per month)
            </label>
            <input
              type="number"
              id="mentoring_capacity_hours_per_month"
              name="mentoring_capacity_hours_per_month"
              value={formData.mentoring_capacity_hours_per_month}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="areas_of_expertise">
              Areas of Expertise
            </label>
            <textarea
              id="areas_of_expertise"
              name="areas_of_expertise"
              value={formData.areas_of_expertise}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="mentoring_preferences">
              Mentoring Preferences (communication, format, duration)
            </label>
            <textarea
              id="mentoring_preferences"
              name="mentoring_preferences"
              value={formData.mentoring_preferences}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="mentoring_experience_years">
              Mentoring Experience (years)
            </label>
            <input
              type="number"
              id="mentoring_experience_years"
              name="mentoring_experience_years"
              value={formData.mentoring_experience_years}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="mentoring_statement">
              Brief Mentoring Statement
            </label>
            <textarea
              id="mentoring_statement"
              name="mentoring_statement"
              value={formData.mentoring_statement}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="max_mentees">
              Maximum Number of Mentees
            </label>
            <input
              type="number"
              id="max_mentees"
              name="max_mentees"
              value={formData.max_mentees}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* Communication details for mentees section */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="session_details">
              How Mentees Can Connect With You (Optional)
            </label>
            <textarea
              id="session_details"
              name="session_details"
              value={formData.session_details || ''}
              onChange={handleChange}
              placeholder="Provide information about how mentees can schedule sessions with you, e.g., Zoom links, scheduling links, preferred contact method, etc."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            ></textarea>
            <p className="text-sm text-gray-600 mt-1">This information will be visible to approved mentees.</p>
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
            {loading ? 'Processing...' : isExistingMentor ? 'Update Mentorship Details' : 'Register as Mentor'}
          </button>
        </form>
      )}
    </div>
  );
}
