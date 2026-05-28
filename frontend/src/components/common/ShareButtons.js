import React, { useState } from 'react';
import { Twitter, Facebook, Linkedin, Link, Check } from 'lucide-react';
import { SOCIAL_ENABLED, ENABLE_PLATFORMS } from '../../constants/social';

const ShareButtons = ({ url, title }) => {
  const [copied, setCopied] = useState(false);

  const platforms = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    });
  };

  if (!SOCIAL_ENABLED) return null;

  return (
    <div className="flex items-center space-x-2">
      <span className="font-semibold text-gray-700 mr-2">Share:</span>
      {ENABLE_PLATFORMS.twitter && (
        <a href={platforms.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400">
          <Twitter size={20} />
        </a>
      )}
      {ENABLE_PLATFORMS.facebook && (
        <a href={platforms.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600">
          <Facebook size={20} />
        </a>
      )}
      {ENABLE_PLATFORMS.linkedin && (
        <a href={platforms.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-700">
          <Linkedin size={20} />
        </a>
      )}
      <button onClick={handleCopy} className="text-gray-500 hover:text-gray-800">
        {copied ? <Check size={20} className="text-green-500" /> : <Link size={20} />}
      </button>
    </div>
  );
};

export default ShareButtons;
