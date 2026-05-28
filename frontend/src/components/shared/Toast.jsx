import React from 'react';
import { toast as hotToast } from 'react-hot-toast';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============================================
// ENHANCED TOAST WRAPPER FOR REACT-HOT-TOAST
// ============================================
// This module provides accessible, styled toast notifications
// that wrap react-hot-toast with consistent UX patterns.
// The app already uses react-hot-toast, so we enhance it rather than replace.

// Toast style configurations
const toastStyles = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    className: 'bg-red-50 border-red-200 text-red-800',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    className: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  info: {
    icon: <Info className="w-5 h-5 text-sky-500" />,
    className: 'bg-sky-50 border-sky-200 text-sky-800',
  },
};

// Default toast options for accessibility and consistency
const defaultOptions = {
  duration: 5000,
  position: 'top-right',
  // Ensure toasts are announced to screen readers
  ariaProps: {
    role: 'status',
    'aria-live': 'polite',
  },
};

/**
 * Show a basic toast message
 * @param {string} message - The message to display
 * @param {object} options - Additional options
 */
export function showToast(message, options = {}) {
  return hotToast(message, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Show a success toast
 * @param {string} message - The success message
 * @param {object} options - Additional options
 */
export function showSuccess(message, options = {}) {
  return hotToast.success(message, {
    ...defaultOptions,
    duration: 4000,
    icon: toastStyles.success.icon,
    className: toastStyles.success.className,
    ...options,
  });
}

/**
 * Show an error toast (longer duration, assertive for screen readers)
 * @param {string} message - The error message
 * @param {object} options - Additional options
 */
export function showError(message, options = {}) {
  return hotToast.error(message, {
    ...defaultOptions,
    duration: 8000,
    icon: toastStyles.error.icon,
    className: toastStyles.error.className,
    ariaProps: {
      role: 'alert',
      'aria-live': 'assertive',
    },
    ...options,
  });
}

/**
 * Show a warning toast
 * @param {string} message - The warning message
 * @param {object} options - Additional options
 */
export function showWarning(message, options = {}) {
  return hotToast(message, {
    ...defaultOptions,
    duration: 6000,
    icon: toastStyles.warning.icon,
    className: toastStyles.warning.className,
    ...options,
  });
}

/**
 * Show an info toast
 * @param {string} message - The info message
 * @param {object} options - Additional options
 */
export function showInfo(message, options = {}) {
  return hotToast(message, {
    ...defaultOptions,
    icon: toastStyles.info.icon,
    className: toastStyles.info.className,
    ...options,
  });
}

/**
 * Show a toast for async operations (loading -> success/error)
 * @param {Promise} promise - The promise to track
 * @param {object} messages - Messages for each state { loading, success, error }
 * @param {object} options - Additional options
 */
export function toastPromise(promise, messages, options = {}) {
  return hotToast.promise(
    promise,
    {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: (err) => messages.error || err?.message || 'Something went wrong',
    },
    {
      ...defaultOptions,
      ...options,
    }
  );
}

/**
 * Dismiss a toast by ID
 * @param {string} toastId - The toast ID to dismiss
 */
export function dismissToast(toastId) {
  if (toastId) {
    hotToast.dismiss(toastId);
  } else {
    hotToast.dismiss();
  }
}

/**
 * Hook to access toast functions
 * @returns {{ toast: Function, success: Function, error: Function, warning: Function, info: Function, dismiss: Function, promise: Function }}
 */
export function useToast() {
  return {
    toast: showToast,
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    dismiss: dismissToast,
    promise: toastPromise,
  };
}

/**
 * Custom toast component for more complex toasts
 * Use with hotToast.custom()
 */
export function CustomToast({ 
  t, 
  type = 'info', 
  title, 
  message, 
  action, 
  actionLabel 
}) {
  const style = toastStyles[type] || toastStyles.info;
  
  return (
    <div
      className={`
        ${t.visible ? 'animate-enter' : 'animate-leave'}
        max-w-md w-full shadow-lg rounded-lg pointer-events-auto
        flex items-start gap-3 p-4 border
        ${style.className}
      `}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {style.icon}
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-sm">{title}</p>
        )}
        <p className={`text-sm ${title ? 'mt-1' : ''}`}>
          {message}
        </p>
        
        {actionLabel && action && (
          <button
            type="button"
            onClick={() => {
              action();
              hotToast.dismiss(t.id);
            }}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          >
            {actionLabel}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => hotToast.dismiss(t.id)}
        className="shrink-0 p-1 rounded hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Show a custom toast with title, message, and optional action
 * @param {object} props - { type, title, message, action, actionLabel, duration }
 */
export function showCustomToast({ type, title, message, action, actionLabel, duration }) {
  return hotToast.custom(
    (t) => (
      <CustomToast
        t={t}
        type={type}
        title={title}
        message={message}
        action={action}
        actionLabel={actionLabel}
      />
    ),
    { duration: duration || defaultOptions.duration }
  );
}

// Re-export the raw toast for advanced usage
export { hotToast as toast };

export default useToast;
