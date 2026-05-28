import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

// Displayed when contact details are not visible to the current viewer.
export default function LockedContactInfo() {
  return (
    <div className="flex items-center space-x-3 text-sm text-slate-600">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium text-slate-800">Contact details locked</p>
        <p className="text-xs text-slate-500">Connect to view contact details.</p>
      </div>
    </div>
  );
}
