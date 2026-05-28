import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

const SupportPageHeader = ({ hideBackWhenFromRegistration = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  let fromRegistration = false;

  if (hideBackWhenFromRegistration) {
    try {
      const params = new URLSearchParams(location.search || '');
      fromRegistration = params.get('from') === 'registration';
    } catch (_) {
      fromRegistration = false;
    }
  }
  const showDefaultBack = !hideBackWhenFromRegistration || !fromRegistration;
  const showRegistrationBack = hideBackWhenFromRegistration && fromRegistration;

  return (
    <div className="mb-6 grid grid-cols-3 items-center">
      <div className="flex items-center justify-start">
        {showDefaultBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-ocean-700 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        )}
        {showRegistrationBack && (
          <button
            onClick={() => navigate('/register?step=2')}
            aria-label="Back to registration"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-ocean-700 hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to registration</span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-center">
        <a
          href="/"
          target="_self"
          className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          aria-label="AMET Alumni Home"
        >
          <Logo className="h-8 w-auto" />
          <span className="text-lg font-semibold text-gray-900">AMET Alumni</span>
        </a>
      </div>
      <div />
    </div>
  );
};

export default SupportPageHeader;
