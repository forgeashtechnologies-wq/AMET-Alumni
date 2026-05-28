import React, { useEffect, useRef } from 'react';
import Logo from '../common/Logo';
import { Link, useLocation } from 'react-router-dom';
import logger from '../../utils/logger';
import { 
  HomeIcon, 
  UsersIcon, 
  CalendarIcon, 
  BriefcaseIcon,
  BookmarkIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  ArrowUpTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileNav } from './MobileNavContext';

const Navigation = () => {
  const location = useLocation();
  const { signOut, getUserRole, profile, hasPermission, isAdmin } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Define all possible menu items with their required permissions
  const allMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HomeIcon, permission: 'access:dashboard' },
    { path: '/directory', label: 'Alumni Directory', icon: UsersIcon, permission: 'view:alumni_directory' },
    { path: '/events', label: 'Events', icon: CalendarIcon, permission: 'access:events' },
    { path: '/jobs', label: 'Job Portal', icon: BriefcaseIcon, permission: 'view:jobs' },
    { path: '/mentorship', label: 'Mentorship', icon: AcademicCapIcon, permission: 'request:mentorship' },
    { path: '/groups', label: 'Groups/Chapters', icon: UserGroupIcon, permission: 'access:groups' },
    { path: '/messages', label: 'Messages', icon: ChatBubbleLeftRightIcon, permission: 'message:users' },
    // Admin Settings is the only admin entry in the sidebar
    // All other admin pages are accessible through Admin Settings
  ];

  // Filter menu items based on user's permissions
  const getMenuItems = () => {
    const role = getUserRole();
    // Filter menu items that the user has permission to access
    // Additionally, hide Directory for employers explicitly
    return allMenuItems.filter(item => {
      if (role === 'employer' && (item.path === '/directory' || item.path === '/groups')) return false;
      return hasPermission(item.permission);
    });
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const { open, setOpen } = useMobileNav();
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  return (
    <>
      <aside className="hidden md:flex md:w-64 md:flex-col md:bg-white md:shadow-lg">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ocean-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <Logo className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">AMET Alumni</h1>
            </div>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-4 py-6 space-y-1">
          {getMenuItems().map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative min-h-[44px]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2
                  ${isActive(item.path) 
                    ? 'nav-active text-white' 
                    : 'text-gray-700 hover:bg-ocean-50 hover:text-ocean-700'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-ocean-200">
          <Link
            to="/profile"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-ocean-50 hover:text-ocean-700 transition-all duration-200 mb-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            <CogIcon className="w-5 h-5 mr-3" />
            Profile Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin/settings"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-ocean-50 hover:text-ocean-700 transition-all duration-200 mb-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
            >
              <ShieldCheckIcon className="w-5 h-5 mr-3" />
              Admin Settings
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-ocean-700 rounded-lg hover:bg-ocean-50 transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          className={`absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-xl border-r transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-14 flex items-center justify-between px-3 border-b">
            <span className="font-semibold">Menu</span>
            <button aria-label="Close menu" className="p-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(false)}>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <Logo className="h-8 w-auto" />
              <h2 className="text-lg font-semibold">AMET Alumni</h2>
            </div>
          </div>
          <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3 space-y-1">
            {getMenuItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={`block rounded-md px-3 py-2 min-h-[44px] ${isActive(item.path) ? 'bg-ocean-50 text-ocean-700' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t space-y-2">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-ocean-50 hover:text-ocean-700 transition-all duration-200 min-h-[44px]"
            >
              <CogIcon className="w-5 h-5 mr-3" />
              Profile Settings
            </Link>
            {isAdmin && (
              <Link
                to="/admin/settings"
                onClick={() => setOpen(false)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-ocean-50 hover:text-ocean-700 transition-all duration-200 min-h-[44px]"
              >
                <ShieldCheckIcon className="w-5 h-5 mr-3" />
                Admin Settings
              </Link>
            )}
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-ocean-700 rounded-lg hover:bg-ocean-50 transition-all duration-200 min-h-[44px]"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;