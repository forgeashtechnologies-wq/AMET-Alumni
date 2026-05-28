import React from 'react';
import toast from 'react-hot-toast';
import { BookmarkIcon as BookmarkOutline } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import logger from '../../utils/logger';

/**
 * BookmarkButton component to centralize bookmark logic and error handling
 * @param {string} jobId - The ID of the job to bookmark/unbookmark
 * @param {boolean} isBookmarked - Whether the job is currently bookmarked
 * @param {function} handleBookmark - Function to handle the bookmark action
 */
const BookmarkButton = ({ jobId, isBookmarked, handleBookmark }) => {
  const handleClick = () => {
    if (typeof handleBookmark === 'function') {
      handleBookmark(jobId);
    } else {
      logger.error('handleBookmark is not a function');
      toast.error('Unable to save bookmark. Please try again later.');
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      className={`p-2 rounded-full transition-colors duration-200
        ${isBookmarked ? 'bg-ocean-100 text-ocean-600 hover:bg-ocean-200' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      {isBookmarked ? (
        <BookmarkSolid className="w-5 h-5" />
      ) : (
        <BookmarkOutline className="w-5 h-5" />
      )}
    </button>
  );
};

export default BookmarkButton;
