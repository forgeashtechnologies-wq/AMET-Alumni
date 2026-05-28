import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const MessageBubble = ({ message, isOwn, timestamp, readStatus }) => {
  // Helper function to determine if a URL is an image
  const isImageUrl = (url) => {
    if (!url) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    return imageExtensions.some(ext => url.toLowerCase().endsWith('.' + ext));
  };

  // Helper function to get file name from URL
  const getFileName = (url) => {
    if (!url) return 'file';
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  };

  const isFileMessage = message.message_type === 'file';
  const fileUrl = message.attachment_url || message.file_url; // Support both field names

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div 
        className={`
          relative
          max-w-xs md:max-w-md lg:max-w-lg 
          rounded-lg 
          px-4 py-3 
          ${isOwn ? 'bg-ocean-500 text-white' : 'bg-gray-100 text-gray-800'}
        `}
      >
        {/* File message */}
        {isFileMessage && fileUrl && (
          <div className="mb-2">
            {isImageUrl(fileUrl) ? (
              // Image file
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img 
                  src={fileUrl} 
                  alt="Attachment" 
                  className="max-w-full h-auto rounded mb-1" 
                  style={{ maxHeight: '200px' }} 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/200x150?text=Image+not+available';
                  }}
                />
                <div className="text-xs truncate">
                  {getFileName(fileUrl)}
                </div>
              </a>
            ) : (
              // Other file types
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`
                  flex items-center p-2 border rounded 
                  ${isOwn ? 'border-ocean-300 bg-ocean-600' : 'border-gray-300 bg-gray-200'}
                `}
              >
                <svg className={`h-5 w-5 ${isOwn ? 'text-ocean-200' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="ml-2 text-sm truncate max-w-[200px]">{getFileName(fileUrl)}</span>
              </a>
            )}
          </div>
        )}
        
        {/* Text content */}
        {(message.body || message.content) && (
          <p className="break-words">{message.body || message.content}</p>
        )}
        
        {/* Timestamp and read receipt */}
        <div className="flex items-center justify-end mt-1 space-x-1">
          {isOwn && readStatus && (
            <span className="text-xs">
              <CheckCircleIcon className="h-3 w-3 inline" /> Read
            </span>
          )}
          <span className="text-xs">{timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
