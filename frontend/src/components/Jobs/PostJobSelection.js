import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, LinkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const PostJobSelection = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">How would you like to post a job?</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose the option that works best for you.
          </p>
        </div>
        <div className="space-y-6">
          <Link to="/jobs/post/link" className="group relative w-full flex justify-center items-center px-4 py-4 border border-transparent text-sm font-medium rounded-md text-white bg-ocean-600 hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
            <LinkIcon className="h-6 w-6 mr-3" />
            Post with a Link
            <ArrowRightIcon className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link to="/jobs/post" className="group relative w-full flex justify-center items-center px-4 py-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
            <DocumentTextIcon className="h-6 w-6 mr-3" />
            Fill Out Form Manually
            <ArrowRightIcon className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostJobSelection;
