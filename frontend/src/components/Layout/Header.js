import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Bell from '../Notifications/Bell';
import { useCurrentUserIdentity } from '../../hooks/useCurrentUser';
import { 
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useMobileNav } from './MobileNavContext';

const Header = ({ user }) => {
  const { user: authUserFromContext, profile: profileFromContext, signOut, role: userRole } = useAuth();
  const { name: displayName, avatarUrl, isLoading } = useCurrentUserIdentity();
  const currentUser = profileFromContext || authUserFromContext || user;
  const avatarSrc = avatarUrl ? `${avatarUrl}?t=${new Date().getTime()}` : '/default-avatar.svg';
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const { open: isNavOpen, setOpen: setNavOpen } = useMobileNav();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await signOut();
    navigate('/login');
  };

  // Resolve a stable role label from the normalized userRole so it does not
  // visually flip when profile/auth sources hydrate or when navigating tabs.
  const resolvedRoleLabel =
    userRole === 'super_admin'
      ? 'Super Admin'
      : userRole === 'admin'
      ? 'Administrator'
      : userRole === 'employer'
      ? 'Employer'
      : userRole === 'student'
      ? 'Student'
      : userRole === 'alumni'
      ? 'Alumni'
      : '';

  return (
    <header role="banner" className="bg-white px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between space-x-4 sm:space-x-6">
        {/* Logo and Title */}
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Open menu"
            aria-controls="mobile-nav"
            aria-expanded={isNavOpen}
            onClick={() => setNavOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <Link to="/" className="flex items-center space-x-3">
            
            
          </Link>
        </div>

        {/* Animated Tagline with Water Animation - Centered */}
        <div className="hidden sm:flex flex-1 justify-center px-4">
          <style>
            {`
              @keyframes fade-in-slide-up {
                0% {
                  opacity: 0;
                  transform: translateY(10px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              .tagline-animation {
                animation: fade-in-slide-up 1s ease-out forwards;
              }

              @keyframes wave {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }

              .wave-container {
                width: 250px; /* Width of the visible wave area */
                height: 15px; /* Height of the wave */
                overflow: hidden;
                margin-top: 2px; /* Space below the tagline */
              }

              .wave-svg {
                width: 200%; /* SVG is twice the width to allow for smooth looping */
                height: 100%;
                animation: wave 4s linear infinite;
              }
            `}
          </style>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold text-ocean-700 tagline-animation">
              Connecting Mariners Since 1993
            </h2>
            <div className="wave-container">
              <svg className="wave-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 40">
                {/* The wave is duplicated to create a seamless loop */}
                <path fill="none" stroke="#3498db" strokeWidth="2" d="M0,20 Q100,0 200,20 T400,20 Q500,0 600,20 T800,20" />
                <path fill="none" stroke="#3498db" strokeWidth="2" d="M800,20 Q900,0 1000,20 T1200,20 Q1300,0 1400,20 T1600,20" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">

          {/* Notifications */}
          <Bell />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(prev => !prev)}
              aria-expanded={showUserMenu}
              aria-label="User menu"
              className="flex items-center space-x-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 p-2 rounded-lg hover:bg-gray-100 min-h-[44px]"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{isLoading ? '…' : displayName}</p>
                <p className="text-xs text-ocean-600">
                  {resolvedRoleLabel || ' '}
                </p>
              </div>
              {isLoading ? (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="spinner spinner-sm" aria-hidden="true" />
                </div>
              ) : (
                <img 
                  src={avatarSrc}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-avatar.svg';
                  }}
                />
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200" role="menu" aria-label="User menu">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 truncate">{isLoading ? '…' : displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.email || 'No email provided'}</p>
                    <p className="text-xs text-ocean-600 mt-1 font-medium">
                      {resolvedRoleLabel || ' '}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
                    onClick={() => setShowUserMenu(false)}
                    role="menuitem"
                  >
                    Your Profile
                  </Link>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;