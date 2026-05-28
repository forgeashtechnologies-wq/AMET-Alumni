import React, { useState, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftIcon, CameraIcon } from '@heroicons/react/24/solid';
import logger from '../../utils/logger';

const FEEDBACK_TYPES = [
  { id: 'bug', name: 'Something is broken', color: 'bg-red-500' },
  { id: 'feature', name: 'New idea or feature', color: 'bg-blue-500' },
  { id: 'improvement', name: 'Make this better', color: 'bg-green-500' },
  { id: 'other', name: 'Something else', color: 'bg-purple-500' }
];

const FeedbackWidget = () => {
  const { user, isApproved } = useAuth();
  // All hooks must be declared before any conditional return
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const fileInputRef = useRef(null);
  // Gate entirely by role: only super_admin can see/submit feedback (RLS will also enforce)
  if (!user || !isApproved) return null;

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    // Reset form when closing
    if (isOpen) {
      resetForm();
    }
  };

  const resetForm = () => {
    setFeedbackType('');
    setDescription('');
    setScreenshot(null);
  };

  const handleScreenshotUpload = async (file) => {
    if (!file) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('feedback_screenshots')
        .upload(filePath, file);
        
      if (uploadError) {
        logger.error('Error uploading screenshot:', uploadError);
        return null;
      }

      return filePath;
    } catch (error) {
      logger.error('Error handling screenshot upload:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit feedback');
      return;
    }
    
    if (!feedbackType) {
      toast.error('Please select a feedback type');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get current page URL
      const page = window.location.pathname;
      
      // Upload screenshot if one was provided
      let screenshotUrl = null;
      if (screenshot) {
        screenshotUrl = await handleScreenshotUpload(screenshot);
      }
      
      // Insert feedback into database
      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          page,
          feedback_type: feedbackType,
          description,
          screenshot_url: screenshotUrl
        });
        
      if (error) {
        logger.error('Error submitting feedback:', error);
        toast.error('Failed to submit feedback. Please try again.');
      } else {
        toast.success('Feedback submitted successfully! Thank you.');
        resetForm();
        setIsOpen(false);
      }
    } catch (error) {
      logger.error('Error in feedback submission:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const triggerScreenshotUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg w-80 overflow-hidden transition-all duration-300 ease-in-out">
          <div className="bg-indigo-600 px-4 py-3 text-white flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Help us improve AMET Alumni</h3>
              <p className="mt-0.5 text-xs text-indigo-100">
                Tell us what felt confusing, broken, or missing on this page.
              </p>
            </div>
            <button onClick={toggleWidget} className="text-white hover:text-gray-200">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback type</label>
              <p className="text-xs text-gray-500 mb-1">Choose what best describes your feedback.</p>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFeedbackType(type.id)}
                    className={`px-3 py-1.5 rounded text-white text-xs font-medium ${
                      feedbackType === type.id ? `${type.color} ring-2 ring-offset-2 ring-${type.color.split('-')[1]}-400` : `${type.color} opacity-70 hover:opacity-100`
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">What happened or what would you like to see?</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                placeholder="Share what you were trying to do, what you saw, and what you expected instead."
              />
              <p className="mt-1 text-xs text-gray-500">
                Include steps and any messages you saw so we can reproduce it faster.
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Screenshot (optional)</label>
                <button 
                  type="button" 
                  onClick={triggerScreenshotUpload} 
                  className="flex items-center text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <CameraIcon className="h-4 w-4 mr-1" />
                  {screenshot ? 'Change Image' : 'Add Image'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                A screenshot helps us see exactly what you see, but it&apos;s not required.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
              />
              {screenshot && (
                <div className="mt-2 relative">
                  <img
                    src={URL.createObjectURL(screenshot)}
                    alt="Screenshot Preview"
                    className="h-20 w-auto rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Send feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={toggleWidget}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-3 py-3 shadow-lg flex items-center justify-center space-x-2 transition-transform hover:scale-110"
          title="Share feedback about this page"
        >
          <ChatBubbleLeftIcon className="h-6 w-6" />
          <span className="hidden sm:inline text-sm font-medium">Feedback</span>
        </button>
      )}
    </div>
  );
};

export default FeedbackWidget;
