import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../utils/supabase';

const EditUserModal = ({ user, isOpen, onClose, onSave, isSuperAdminActor = false }) => {
  const [selectedRole, setSelectedRole] = useState('');

  const BASE_ROLES = [
    { name: 'alumni', description: 'Alumni' },
    { name: 'employer', description: 'Employer' },
    { name: 'student', description: 'Mentee/Student' },
    { name: 'admin', description: 'Admin' },
  ];
  const ALL_ROLES = isSuperAdminActor
    ? [...BASE_ROLES, { name: 'super_admin', description: 'Super Admin' }]
    : BASE_ROLES;

  useEffect(() => {
    // When the modal opens, reset the selected role.
    if (isOpen) {
      setSelectedRole('');
    }
  }, [isOpen]);

  if (!user) return null;

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
  };

  const handleSave = () => {
    if (!selectedRole) {
      alert('Please select a new role.');
      return;
    }
    onSave(user.id, selectedRole);
    onClose();
  };

  // Filter out the user's current role from the list of options
  const availableRoles = ALL_ROLES.filter(r => r.name !== user.role);

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-20" onClose={onClose}>
        <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                  <span>Edit Role for: {user.full_name}</span>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </Dialog.Title>
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-gray-500">Current Role: <span className="font-semibold text-gray-800">{user.role}</span></p>
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-gray-700">Assign New Role</p>
                    <div className="space-y-2">
                      {availableRoles.map(role => (
                        <div key={role.name} className="flex items-center">
                          <input 
                            id={role.name} 
                            name="role" 
                            type="radio" 
                            value={role.name}
                            checked={selectedRole === role.name}
                            onChange={handleRoleChange} 
                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                          />
                          <label htmlFor={role.name} className="ml-3 block text-sm font-medium text-gray-700">
                            {role.description}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50" onClick={onClose}>Cancel</button>
                  <button type="button" className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-gradient-to-b from-ocean-500 to-ocean-600 text-white text-sm font-medium hover:from-ocean-600 hover:to-ocean-700 transition-[colors,opacity,transform,shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSave} disabled={!selectedRole}>Save Changes</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditUserModal;
