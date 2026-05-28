import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { toFriendlyToast } from '../../utils/errors';

const ResumeUploadForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    portfolioLink: '',
    linkedinProfile: '',
    desiredJobTitles: '',
    desiredIndustries: '',
    preferredLocations: '',
    willingToRelocate: false,
    jobAlertActive: true,
    jobAlertFrequency: 'daily',
    jobAlertKeywords: ''
  });
  
  // Alert frequency options
  const alertFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'immediate', label: 'Immediate' }
  ];
  
  // Check if user already has a profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('resume_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          logger.error('Error fetching resume profile:', error);
          throw error;
        }
        
        if (data) {
          setExistingProfile(data);
          
          // Populate form with existing data
          setFormData({
            portfolioLink: data.portfolio_link || '',
            linkedinProfile: data.linkedin_profile || '',
            desiredJobTitles: (data.desired_job_titles || []).join(', '),
            desiredIndustries: (data.desired_industries || []).join(', '),
            preferredLocations: (data.preferred_locations || []).join(', '),
            willingToRelocate: data.willing_to_relocate || false,
            jobAlertActive: data.job_alert_active !== false, // default to true if null
            jobAlertFrequency: data.job_alert_frequency || 'daily',
            jobAlertKeywords: (data.job_alert_keywords || []).join(', ')
          });
        }
      } catch (error) {
        toFriendlyToast(toast, error, 'Could not load your profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (5MB limit = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      e.target.value = ''; // Clear the file input
      return;
    }
    
    if (type === 'resume') {
      setResumeFile(file);
    } else if (type === 'coverLetter') {
      setCoverLetterFile(file);
    }
  };
  
  const uploadFile = async (file, bucket) => {
    if (!file) return null;
    
    try {
      // Validate file size and type
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`File size exceeds 5MB limit`);
      }
      
      const validExtensions = ['pdf', 'doc', 'docx'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      if (!validExtensions.includes(fileExt)) {
        throw new Error(`Invalid file type. Please upload PDF or Word documents only.`);
      }
      
      // Create a unique filename to prevent collisions
      const timestamp = new Date().getTime();
      const filePath = `${user.id}/${timestamp}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // We don't need to check if bucket exists - we just try to upload
      // If bucket doesn't exist, it will fail with appropriate error
      logger.log(`Attempting to upload to ${bucket} bucket...`);
      
      // Try to upload the file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (error) {
        logger.error(`Error uploading ${bucket} file:`, error);
        
        // Handle common storage errors
        if (error.message.includes('JWT')) {
          throw new Error('Authentication error. Please try logging out and back in.');
        } else if (error.message.includes('permission')) {
          throw new Error('You do not have permission to upload files.');
        } else if (error.message.includes('bucket')) {
          throw new Error(`Storage location '${bucket}' is unavailable. Please contact support.`);
        }
        
        throw error;
      }
      
      // For resumes bucket, we store only the storage path (no public URL)
      if (bucket === 'resumes') {
        return data?.path || filePath;
      }

      // Other buckets may continue to use public URLs as before
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get file URL after upload.');
      }
        
      return urlData.publicUrl;
    } catch (error) {
      logger.error(`Error in uploadFile:`, error);
      throw error;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to upload your resume.");
      return;
    }
    
    // Simple URL validation for external links
    const validateURL = (url) => {
      if (!url || url.trim() === '') return true; // Empty URLs are valid (optional fields)
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    };
    
    // Validate URLs before proceeding
    if (!validateURL(formData.portfolioLink)) {
      toast.error('Please enter a valid portfolio URL or leave it empty');
      return;
    }
    
    if (!validateURL(formData.linkedinProfile)) {
      toast.error('Please enter a valid LinkedIn profile URL or leave it empty');
      return;
    }
    
    // Show uploading state
    setIsSubmitting(true);
    toast.loading('Uploading your profile...', { id: 'profile-upload' });
    
    try {
      logger.log('Starting resume profile submission...');
      
      // Upload resume if provided (wrapped in try/catch for better error handling)
      let resumeUrl = existingProfile?.resume_url || null;
      if (resumeFile) {
        try {
          resumeUrl = await uploadFile(resumeFile, 'resumes');
          logger.log('Resume uploaded successfully');
        } catch (uploadError) {
          logger.error('Resume upload failed:', uploadError);
          toFriendlyToast(toast, uploadError, 'Resume upload failed. Please try again.');
          setIsSubmitting(false);
          toast.dismiss('profile-upload');
          return;
        }
      }
      
      // Upload cover letter if provided (wrapped in try/catch)
      let coverLetterUrl = existingProfile?.cover_letter_url || null;
      if (coverLetterFile) {
        try {
          coverLetterUrl = await uploadFile(coverLetterFile, 'cover-letters');
          logger.log('Cover letter uploaded successfully');
        } catch (uploadError) {
          logger.error('Cover letter upload failed:', uploadError);
          toFriendlyToast(toast, uploadError, 'Cover letter upload failed. Please try again.');
          setIsSubmitting(false);
          toast.dismiss('profile-upload');
          return;
        }
      }
      
      // Convert comma-separated strings to arrays and clean the data
      const splitAndClean = (str) => {
        return str ? str.split(',').map(item => item.trim()).filter(Boolean) : [];
      };
      
      const desiredJobTitles = splitAndClean(formData.desiredJobTitles);
      const desiredIndustries = splitAndClean(formData.desiredIndustries);
      const preferredLocations = splitAndClean(formData.preferredLocations);
      const jobAlertKeywords = splitAndClean(formData.jobAlertKeywords);
      
      // Clean URLs by ensuring they have proper http/https prefix
      const cleanUrl = (url) => {
        if (!url || url.trim() === '') return '';
        let trimmedUrl = url.trim();
        return trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
      };
      
      const profileData = {
        user_id: user.id,
        resume_url: resumeUrl,
        cover_letter_url: coverLetterUrl,
        portfolio_link: cleanUrl(formData.portfolioLink),
        linkedin_profile: cleanUrl(formData.linkedinProfile),
        desired_job_titles: desiredJobTitles,
        desired_industries: desiredIndustries,
        preferred_locations: preferredLocations,
        willing_to_relocate: formData.willingToRelocate,
        job_alert_active: formData.jobAlertActive,
        job_alert_frequency: formData.jobAlertFrequency,
        job_alert_keywords: jobAlertKeywords,
        updated_at: new Date().toISOString()
      };
      
      // Save profile data to database
      let result;
      
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('resume_profiles')
          .update(profileData)
          .eq('id', existingProfile.id)
          .select();
      } else {
        // Insert new profile
        result = await supabase
          .from('resume_profiles')
          .insert([profileData])
          .select();
      }
      
      const { data, error } = result;
      
      if (error) {
        logger.error('Error saving resume profile:', error);
        throw error;
      }
      
      logger.log('Resume profile saved successfully:', data);
      toast.dismiss('profile-upload');
      toast.success(`Resume profile ${existingProfile ? 'updated' : 'created'} successfully!`);
      
      // Short delay before navigation to ensure toast is seen
      setTimeout(() => navigate('/jobs'), 1000);
    } catch (error) {
      logger.error('Error saving resume profile:', error);
      toast.dismiss('profile-upload');
      toFriendlyToast(toast, error, 'Could not save your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-12">Loading your profile...</div>;
  }
  
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">You must be logged in to upload your resume.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Go to Login
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {existingProfile ? 'Update Your Resume Profile' : 'Create Your Resume Profile'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
            Upload Documents
          </h3>
          
          {/* Resume Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resume/CV (PDF, Word, max 5MB)
            </label>
            <div>
              <input
                type="file"
                onChange={(e) => handleFileChange(e, 'resume')}
                accept=".pdf,.doc,.docx"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {existingProfile?.resume_url && !resumeFile && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Resume already uploaded. Upload a new one to replace it.</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Cover Letter Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Letter (Optional, PDF, Word, max 5MB)
            </label>
            <div>
              <input
                type="file"
                onChange={(e) => handleFileChange(e, 'coverLetter')}
                accept=".pdf,.doc,.docx"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {existingProfile?.cover_letter_url && !coverLetterFile && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Cover letter already uploaded. Upload a new one to replace it.</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
            Professional Profile
          </h3>
          
          {/* Portfolio Link */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio Website (Optional)
            </label>
            <input
              type="url"
              name="portfolioLink"
              value={formData.portfolioLink}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="https://your-portfolio.com"
            />
          </div>
          
          {/* LinkedIn Profile */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn Profile (Optional)
            </label>
            <input
              type="url"
              name="linkedinProfile"
              value={formData.linkedinProfile}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="https://www.linkedin.com/in/your-profile"
            />
          </div>
          
          {/* Desired Job Titles */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desired Job Titles (comma separated)
            </label>
            <input
              type="text"
              name="desiredJobTitles"
              value={formData.desiredJobTitles}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Software Developer, Frontend Engineer, UX Designer"
            />
          </div>
          
          {/* Desired Industries */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desired Industries (comma separated)
            </label>
            <input
              type="text"
              name="desiredIndustries"
              value={formData.desiredIndustries}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Technology, Healthcare, Finance"
            />
          </div>
          
          {/* Preferred Locations */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Locations (comma separated)
            </label>
            <input
              type="text"
              name="preferredLocations"
              value={formData.preferredLocations}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., New York, San Francisco, Remote"
            />
          </div>
          
          {/* Willing to Relocate */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="willingToRelocate"
              id="willingToRelocate"
              checked={formData.willingToRelocate}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="willingToRelocate" className="ml-2 text-sm text-gray-700">
              I am willing to relocate for the right opportunity
            </label>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
            Job Alert Preferences
          </h3>
          
          {/* Job Alert Active */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="jobAlertActive"
              id="jobAlertActive"
              checked={formData.jobAlertActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="jobAlertActive" className="ml-2 text-sm text-gray-700">
              Send me job alerts based on my profile
            </label>
          </div>
          
          {/* Job Alert Frequency */}
          {formData.jobAlertActive && (
            <div className="mb-4 pl-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Frequency
              </label>
              <select
                name="jobAlertFrequency"
                value={formData.jobAlertFrequency}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {alertFrequencies.map(frequency => (
                  <option key={frequency.value} value={frequency.value}>
                    {frequency.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Job Alert Keywords */}
          {formData.jobAlertActive && (
            <div className="mb-4 pl-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords for Job Alerts (comma separated)
              </label>
              <input
                type="text"
                name="jobAlertKeywords"
                value={formData.jobAlertKeywords}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., React, Node.js, Remote, Senior"
              />
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400"
          >
            {isSubmitting ? 'Saving...' : (existingProfile ? 'Update Profile' : 'Create Profile')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResumeUploadForm;
