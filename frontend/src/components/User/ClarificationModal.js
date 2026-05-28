import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';

const ClarificationModal = ({ isOpen, onClose, rejectionReason }) => {
  const [clarification, setClarification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!clarification.trim()) return;
    
    setIsSubmitting(true);
    try {
      // 1. Store the clarification
      const { data: profileData, error: profileError } = await supabase.auth.getUser();
      
      if (profileError) throw profileError;
      
      const userId = profileData.user.id;
      
      // Skip updating the profile for now until we confirm the schema
      // Instead, store the clarification in localStorage temporarily
      const clarifications = JSON.parse(localStorage.getItem('userClarifications') || '{}');
      clarifications[userId] = {
        text: clarification,
        date: new Date().toISOString()
      };
      localStorage.setItem('userClarifications', JSON.stringify(clarifications));
      
      // 2. Create notifications for all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .or('role.eq.admin,role.eq.super_admin');
        
      if (adminError) throw adminError;
      
      // Create a notification for each admin
      if (adminUsers && adminUsers.length > 0) {
        const notificationPromises = adminUsers.map(admin => {
          return supabase
            .from('notifications')
            .insert({
              recipient_id: admin.id,
              type: 'clarification_submitted',
              // ADMIN-ONLY: Email is intentionally included here in the notification content for moderation / user management.
              content: `Rejected user (${profileData.user.email}) has sent a clarification.`,
              sender_id: userId,
              is_read: false,
              created_at: new Date().toISOString()
            });
        });
        
        await Promise.all(notificationPromises);
      }
      
      toast.success('Your clarification has been submitted successfully');
      setClarification('');
      onClose();
    } catch (err) {
      logger.error('Error submitting clarification:', err);
      toast.error(`Failed to submit clarification: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-20" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="flex items-center text-lg font-medium leading-6 text-gray-900"
                >
                  <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                  <span>Your Account Has Been Rejected</span>
                  <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </Dialog.Title>
                
                <div className="mt-4">
                  <div className="bg-red-50 p-4 rounded-md mb-4">
                    <p className="text-sm text-red-700 font-medium">Rejection Reason:</p>
                    <p className="text-sm text-red-600 mt-1">{rejectionReason || 'No reason provided by the administrator.'}</p>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2">
                    If you believe this is a mistake or would like to provide additional information, you can submit a clarification below:
                  </p>
                  
                  <div className="mt-2">
                    <textarea
                      className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-ocean-500"
                      rows="4"
                      placeholder="Your clarification or additional information..."
                      value={clarification}
                      onChange={(e) => setClarification(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-ocean-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-ocean-700 disabled:bg-ocean-400"
                    onClick={handleSubmit}
                    disabled={!clarification.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Clarification'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ClarificationModal;
