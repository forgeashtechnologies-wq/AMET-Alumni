import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const RejectUserModal = ({ user, isOpen, onClose, onReject }) => {
  const [rejectionComment, setRejectionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!rejectionComment.trim()) {
      return; // Don't submit if comment is empty
    }
    
    setIsSubmitting(true);
    onReject(user.id, rejectionComment);
    setRejectionComment('');
    setIsSubmitting(false);
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
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
                  <span>Reject User</span>
                  <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </Dialog.Title>
                <div className="mt-4">
                  {/* ADMIN-ONLY: Email is intentionally referenced here for moderation / user management. */}
                  <p className="text-sm text-gray-500 mb-4">
                    You are about to reject {user?.full_name || user?.email}. Please provide a reason for rejection:
                  </p>
                  <div className="mt-2">
                    <textarea
                      className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-ocean-500"
                      rows="4"
                      placeholder="Reason for rejection (required)"
                      value={rejectionComment}
                      onChange={(e) => setRejectionComment(e.target.value)}
                      required
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
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:bg-red-400"
                    onClick={handleSubmit}
                    disabled={!rejectionComment.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Rejecting...' : 'Reject User'}
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

export default RejectUserModal;
