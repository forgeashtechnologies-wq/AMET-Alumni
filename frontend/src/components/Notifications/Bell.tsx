import React, { useEffect, useRef, useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import NotificationsPanel from './NotificationsPanel';
import { useBellUnreadCount } from '../../hooks/useNotifications';
import { useLocation } from 'react-router-dom';

export default function Bell() {
  const { count: unreadCount } = useBellUnreadCount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const lastCountRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (lastCountRef.current === null) {
      lastCountRef.current = unreadCount;
      return;
    }

    if (unreadCount > lastCountRef.current) {
      setShowNewAlert(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setShowNewAlert(false);
      }, 2000);
    }

    lastCountRef.current = unreadCount;

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [unreadCount]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative p-2 rounded-full hover:bg-gray-100"
        aria-label="Open notifications"
        onClick={() => {
          setOpen((v) => !v);
          setShowNewAlert(false);
        }}
      >
        {showNewAlert && (
          <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-blue-400 opacity-60 animate-ping" />
        )}
        <BellIcon className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-[360px] max-w-[90vw]">
          <NotificationsPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
