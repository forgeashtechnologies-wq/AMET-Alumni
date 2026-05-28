import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SupportPageHeader from '../components/common/SupportPageHeader';

const HelpCenter = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-ocean-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SupportPageHeader />

        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-gray-700 mb-6">
            Find answers to common questions and learn how to use the AMET Alumni Portal.
          </p>

          <div className="space-y-4">
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-medium cursor-pointer">How do I create an account?</summary>
              <div className="mt-2 text-gray-700">
                Go to <Link to="/register" className="text-ocean-600 hover:underline">Register</Link> and follow the steps.
              </div>
            </details>
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-medium cursor-pointer">I forgot my password</summary>
              <div className="mt-2 text-gray-700">
                Visit <Link to="/forgot-password" className="text-ocean-600 hover:underline">Forgot Password</Link> to reset it.
              </div>
            </details>
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-medium cursor-pointer">How do I access the Job Board?</summary>
              <div className="mt-2 text-gray-700">
                You need to sign in to view jobs. Go to <Link to="/login" className="text-ocean-600 hover:underline">Login</Link> first, then open the <Link to="/jobs" className="text-ocean-600 hover:underline">Job Board</Link>.
              </div>
            </details>
          </div>

          <div className="mt-8">
            <p className="text-gray-700">
              Still need help? <Link to="/contact" className="text-ocean-600 hover:underline">Contact us</Link> and we'll get back to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
