import React from 'react';
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

// Renders visible contact details (email / phone) for a profile.
export default function ContactInfo({ email, phone_number }) {
  const hasEmail = Boolean(email);
  const hasPhone = Boolean(phone_number);

  if (!hasEmail && !hasPhone) {
    return null;
  }

  return (
    <div className="space-y-3 text-sm text-slate-700">
      {hasEmail && (
        <div className="flex items-center">
          <EnvelopeIcon className="h-5 w-5 mr-3 text-ocean-600" aria-hidden="true" />
          <a
            href={`mailto:${email}`}
            className="font-medium text-ocean-700 hover:text-ocean-800 hover:underline break-all"
          >
            {email}
          </a>
        </div>
      )}
      {hasPhone && (
        <div className="flex items-center">
          <PhoneIcon className="h-5 w-5 mr-3 text-ocean-600" aria-hidden="true" />
          <a
            href={`tel:${phone_number}`}
            className="font-medium text-ocean-700 hover:text-ocean-800 hover:underline"
          >
            {phone_number}
          </a>
        </div>
      )}
    </div>
  );
}
