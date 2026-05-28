import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

// ============================================
// CONFIRMATION DIALOG COMPONENT
// ============================================
// A properly centered, accessible confirmation dialog
// that renders via portal to ensure it's always on top

/**
 * ConfirmationDialog - Accessible modal for destructive actions
 * 
 * Features:
 * - Renders via portal to document.body (always on top)
 * - Proper focus trap and management
 * - Escape key to close
 * - Click outside to close (unless loading)
 * - Accessible with proper ARIA attributes
 * - Reduced motion support
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {Function} props.onClose - Called when dialog should close
 * @param {Function} props.onConfirm - Called when confirm button clicked
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Dialog description
 * @param {React.ReactNode} props.children - Additional content
 * @param {string} props.confirmText - Confirm button text (default: "Confirm")
 * @param {string} props.cancelText - Cancel button text (default: "Cancel")
 * @param {'danger' | 'warning' | 'info'} props.variant - Dialog style variant
 * @param {boolean} props.loading - Whether action is in progress
 * @param {string} props.itemName - Name of item being acted on (for display)
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  itemName,
}) {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the dialog or confirm button after a brief delay
      requestAnimationFrame(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        } else if (dialogRef.current) {
          dialogRef.current.focus();
        }
      });

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previous element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Variant styles
  const variantStyles = {
    danger: {
      icon: TrashIcon,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBg: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
      highlightBg: 'bg-red-50 border-red-200',
      highlightText: 'text-red-800',
      highlightSubtext: 'text-red-600',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      confirmBg: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
      highlightBg: 'bg-amber-50 border-amber-200',
      highlightText: 'text-amber-800',
      highlightSubtext: 'text-amber-600',
    },
    info: {
      icon: CheckCircleIcon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      confirmBg: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
      highlightBg: 'bg-blue-50 border-blue-200',
      highlightText: 'text-blue-800',
      highlightSubtext: 'text-blue-600',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;
  const Icon = styles.icon;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      aria-labelledby="confirmation-dialog-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop: transparent, no dimming/blur, but still captures outside clicks */}
      <div 
        className="fixed inset-0 bg-transparent transition-opacity"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />

      {/* Dialog positioning container - ensures centering */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {/* Dialog panel */}
        <div
          ref={dialogRef}
          className="relative bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all
                     motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Header with icon */}
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${styles.iconColor}`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  id="confirmation-dialog-title" 
                  className="text-lg font-semibold text-gray-900"
                >
                  {title}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {description}
                </p>
              </div>
            </div>

            {/* Item name highlight box */}
            {itemName && (
              <div className={`mt-4 p-3 rounded-lg border ${styles.highlightBg}`}>
                <p className={`text-sm font-medium ${styles.highlightText}`}>
                  {itemName}
                </p>
                {variant === 'danger' && (
                  <p className={`text-xs mt-1 ${styles.highlightSubtext}`}>
                    This action cannot be undone. All related data will be permanently removed.
                  </p>
                )}
              </div>
            )}

            {/* Additional content */}
            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="inline-flex items-center justify-center min-h-[44px] px-4 py-2
                           rounded-lg border border-gray-300 bg-white text-gray-700 font-medium
                           hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 
                           focus-visible:ring-gray-500 focus-visible:ring-offset-2
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2
                           rounded-lg text-white font-medium
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors ${styles.confirmBg}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Processing...</span>
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via portal to ensure it's always on top
  return createPortal(dialogContent, document.body);
}

/**
 * DeleteConfirmationDialog - Pre-configured for delete actions
 */
export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemType = 'item',
  itemName,
  loading = false,
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemType} Permanently`}
      description={`Are you sure you want to permanently delete this ${itemType.toLowerCase()}?`}
      confirmText={loading ? 'Deleting...' : 'Delete Permanently'}
      cancelText="Cancel"
      variant="danger"
      loading={loading}
      itemName={itemName}
    />
  );
}

/**
 * LeaveConfirmationDialog - Pre-configured for leave/exit actions
 */
export function LeaveConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemType = 'group',
  itemName,
  loading = false,
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Leave ${itemType}`}
      description={`Are you sure you want to leave this ${itemType.toLowerCase()}?`}
      confirmText={loading ? 'Leaving...' : 'Leave'}
      cancelText="Stay"
      variant="warning"
      loading={loading}
      itemName={itemName}
    />
  );
}

export default ConfirmationDialog;
