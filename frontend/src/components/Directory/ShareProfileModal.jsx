import React, { useMemo, useState } from 'react';

export default function ShareProfileModal({ open, onClose, url }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = useMemo(() => encodeURIComponent(url || ''), [url]);

  if (!open) return null;

  const shareTargets = [
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedUrl}`,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'bg-blue-700 hover:bg-blue-800',
    },
    {
      name: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}`,
      color: 'bg-black hover:bg-gray-900',
    },
    {
      name: 'Email',
      href: `mailto:?subject=AMET Alumni Profile&body=${encodedUrl}`,
      color: 'bg-indigo-600 hover:bg-indigo-700',
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // Fallback: allow manual copy
      window.prompt('Copy profile link', url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Share Profile</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 form-input px-3 py-2 rounded border bg-gray-50"
            />
            <button onClick={copy} className="px-3 py-2 rounded bg-ocean-600 text-white hover:bg-ocean-700">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shareTargets.map((t) => (
              <a
                key={t.name}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-2 rounded text-white text-center ${t.color}`}
              >
                {t.name}
              </a>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}
