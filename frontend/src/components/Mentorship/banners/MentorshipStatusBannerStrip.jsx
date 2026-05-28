import React from 'react';
import { useMentorshipBannerModel } from '../../../hooks/useMentorshipBannerModel.js';
import MentorshipBanner from './MentorshipBanner';

/**
 * Container for mentorship status banners.
 * Renders 0-2 banners (one mentee-focused, one mentor-focused) based on role context.
 */
export default function MentorshipStatusBannerStrip() {
  const banners = useMentorshipBannerModel();
  
  if (!banners || banners.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        {banners.map((banner, index) => (
          <MentorshipBanner key={index} {...banner} />
        ))}
      </div>
    </div>
  );
}
