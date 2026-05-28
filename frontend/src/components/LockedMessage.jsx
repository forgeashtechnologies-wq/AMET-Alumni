import React from 'react';

export default function LockedMessage({ message }) {
  return (
    <div className="p-4 border border-red-300 rounded bg-red-50 text-red-600 text-sm">
      <span role="img" aria-label="Locked" className="mr-1">🔒</span>
      {message}
    </div>
  );
}
