import React from 'react';

/**
 * A loading screen component for displaying loading state
 * Used throughout the app when content is being fetched or processed
 */
const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-500 mb-4"></div>
      <p className="text-lg text-gray-600 font-medium">{message}</p>
    </div>
  );
};

export default LoadingScreen;
