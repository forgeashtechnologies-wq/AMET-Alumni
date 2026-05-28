import React from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

/**
 * PinButton component to centralize pin logic and error handling
 * @param {string} jobId - The ID of the job to pin/unpin
 * @param {boolean} isPinned - Whether the job is currently pinned
 * @param {function} handlePin - Function to handle the pin action
 */
const PinButton = ({ jobId, isPinned, handlePin }) => {
  const handleClick = () => {
    if (typeof handlePin === 'function') {
      handlePin(jobId);
    } else {
      logger.error('handlePin is not a function');
      toast.error('Unable to pin job. Please try again later.');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-full hover:bg-gray-100"
      aria-label={isPinned ? 'Remove pin' : 'Pin job'}
      title={isPinned ? 'Unpin Job' : 'Pin Job'}
    >
      {isPinned ? (
        <SolidStarIcon className="w-5 h-5 text-yellow-500" />
      ) : (
        <StarIcon className="w-5 h-5 text-gray-500" />
      )}
    </button>
  );
};

export default PinButton;
