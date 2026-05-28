import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CalendarIcon, UserCircleIcon, BriefcaseIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { formatDate, formatDateOnly } from '../../utils/dateUtils';

const ContentDetailsModal = ({ item, isOpen, onClose }) => {
  if (!item) return null;

  const renderContent = () => {
    switch (item.content_type) {
      case 'job':
        return (
          <dl className="space-y-4">
            <div className="flex items-start">
              <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Company</dt>
                <dd className="text-sm text-gray-900">{item.company_name}</dd>
              </div>
            </div>
            <div className="flex items-start">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{item.description}</dd>
              </div>
            </div>
          </dl>
        );
      case 'event':
        return (
          <dl className="space-y-4">
             <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                  <dd className="text-sm text-gray-900">
                    {item.start_date ? formatDate(item.start_date) : 'N/A'}
                  </dd>
                </div>
                {item.end_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">End Date</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(item.end_date)}
                    </dd>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{item.description}</dd>
              </div>
            </div>
          </dl>
        );
      case 'group':
        return (
          <dl className="space-y-4">
            <div className="flex items-start">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                  {item.description || 'No description provided'}
                </dd>
              </div>
            </div>
            <div className="flex items-start">
              <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <dt className="text-gray-500">Privacy:</dt>
                  <dd className="font-medium">{item.is_private ? 'Private' : 'Public'}</dd>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <dt className="text-gray-500">Audience:</dt>
                  <dd className="font-medium">{item.alumni_only ? 'Alumni only' : 'Open to all roles'}</dd>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="font-medium">
                    {item.is_archived ? 'Archived' :
                      item.is_rejected ? 'Rejected' :
                      item.is_approved || item.approval_status === 'approved' ? 'Approved' :
                      'Pending'}
                  </dd>
                </div>
                {item.rejection_reason && (
                  <div className="text-sm text-red-700">
                    <dt className="text-gray-500">Rejection reason:</dt>
                    <dd className="whitespace-pre-wrap">{item.rejection_reason}</dd>
                  </div>
                )}
                {Array.isArray(item.tags) && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </dl>
        );
      default:
        return <p className="text-sm text-gray-700 whitespace-pre-wrap">{JSON.stringify(item.content_data, null, 2)}</p>;
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                  <span>{item.type} Details</span>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </Dialog.Title>
                
                <div className="mt-4">
                  <h4 className="text-xl font-bold text-gray-800">{item.title || item.name}</h4>
                  <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                    <UserCircleIcon className="h-5 w-5" />
                    <span>{item.creator?.first_name || 'Unknown'} {item.creator?.last_name || ''}</span>
                    <span className="text-gray-300">|</span>
                    <CalendarIcon className="h-5 w-5" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  {renderContent()}
                </div>

                <div className="mt-6 flex justify-end">
                  <button type="button" className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2" onClick={onClose}>
                    Close
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

export default ContentDetailsModal;
