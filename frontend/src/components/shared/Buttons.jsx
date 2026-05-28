import React, { forwardRef } from 'react';
import { MessageSquare, UserMinus, Loader2, Check, AlertCircle } from 'lucide-react';
import logger from '../../utils/logger';

// ============================================
// BUTTON VARIANT CLASSES
// ============================================

// Primary CTAs: solid blue (Connect, Message, key actions)
export const primaryButtonClasses = `
  inline-flex items-center justify-center gap-2 tap-target
  rounded-lg px-4 py-2.5 text-sm font-semibold
  bg-ocean-500 text-white shadow-sm
  hover:bg-ocean-600
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2
  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ocean-500
  active:scale-[0.98] transition-all duration-150
`;

// Secondary CTAs: neutral gray (Cancel, secondary actions)
export const secondaryButtonClasses = `
  inline-flex items-center justify-center gap-2 tap-target
  rounded-lg px-4 py-2.5 text-sm font-semibold
  bg-gray-100 text-gray-700 border border-gray-300
  hover:bg-gray-200 hover:border-gray-400
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
  disabled:opacity-60 disabled:cursor-not-allowed
  active:scale-[0.98] transition-all duration-150
`;

// Outline CTAs: transparent with border
export const outlineButtonClasses = `
  inline-flex items-center justify-center gap-2 tap-target
  rounded-lg px-4 py-2.5 text-sm font-semibold
  bg-transparent border border-gray-300 text-gray-700
  hover:bg-gray-50 hover:border-gray-400
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2
  disabled:opacity-60 disabled:cursor-not-allowed
  active:scale-[0.98] transition-all duration-150
`;

// Danger CTAs: red for destructive actions
export const dangerButtonClasses = `
  inline-flex items-center justify-center gap-2 tap-target
  rounded-lg px-4 py-2.5 text-sm font-semibold
  bg-red-600 text-white shadow-sm
  hover:bg-red-700
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
  disabled:opacity-60 disabled:cursor-not-allowed
  active:scale-[0.98] transition-all duration-150
`;

// Ghost CTAs: minimal styling
export const ghostButtonClasses = `
  inline-flex items-center justify-center gap-2 tap-target
  rounded-lg px-4 py-2.5 text-sm font-semibold
  bg-transparent text-gray-600
  hover:bg-gray-100 hover:text-gray-900
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
  disabled:opacity-60 disabled:cursor-not-allowed
  active:scale-[0.98] transition-all duration-150
`;

// Success state classes
const successClasses = `
  bg-emerald-500 text-white hover:bg-emerald-500
  focus-visible:ring-emerald-500
`;

// Error state classes
const errorClasses = `
  bg-red-500 text-white hover:bg-red-500
  focus-visible:ring-red-500
`;

// Size variants
const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px] min-w-[36px] gap-1.5',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
};

// ============================================
// MAIN BUTTON COMPONENT
// ============================================

/**
 * Universal Button Component with full state coverage
 * 
 * @param {object} props
 * @param {'primary'|'secondary'|'outline'|'danger'|'ghost'} props.variant - Button style variant
 * @param {'sm'|'md'|'lg'} props.size - Button size
 * @param {boolean} props.loading - Shows loading spinner and disables button
 * @param {boolean} props.success - Shows success state (green with checkmark)
 * @param {boolean} props.error - Shows error state (red with alert icon)
 * @param {string} props.loadingText - Text to show while loading
 * @param {string} props.successText - Text to show on success
 * @param {string} props.errorText - Text to show on error
 * @param {React.ReactNode} props.leftIcon - Icon to show on the left
 * @param {React.ReactNode} props.rightIcon - Icon to show on the right
 * @param {boolean} props.fullWidth - Makes button full width
 * @param {string} props.className - Additional CSS classes
 */
export const Button = forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  error = false,
  loadingText,
  successText,
  errorText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}, ref) {
  // Determine which variant classes to use
  const variantClassMap = {
    primary: primaryButtonClasses,
    secondary: secondaryButtonClasses,
    outline: outlineButtonClasses,
    danger: dangerButtonClasses,
    ghost: ghostButtonClasses,
  };

  let baseClasses = variantClassMap[variant] || primaryButtonClasses;
  
  // Override with state-specific classes
  if (success) {
    baseClasses = baseClasses.replace(/bg-\w+-\d+/g, '').replace(/hover:bg-\w+-\d+/g, '') + ' ' + successClasses;
  } else if (error) {
    baseClasses = baseClasses.replace(/bg-\w+-\d+/g, '').replace(/hover:bg-\w+-\d+/g, '') + ' ' + errorClasses;
  }

  // Determine content based on state
  let content = children;
  let icon = leftIcon;
  
  if (loading) {
    icon = <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
    content = loadingText || children;
  } else if (success) {
    icon = <Check className="h-4 w-4" aria-hidden="true" />;
    content = successText || children;
  } else if (error) {
    icon = <AlertCircle className="h-4 w-4" aria-hidden="true" />;
    content = errorText || children;
  }

  // Compute final class string
  const finalClasses = [
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  // Determine aria attributes
  const ariaAttributes = {
    'aria-busy': loading ? 'true' : undefined,
    'aria-disabled': disabled || loading ? 'true' : undefined,
    'aria-label': ariaLabel,
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={finalClasses}
      {...ariaAttributes}
      {...props}
    >
      {icon}
      {content && <span>{content}</span>}
      {rightIcon && !loading && !success && !error && rightIcon}
    </button>
  );
});

// ============================================
// SPECIALIZED BUTTON COMPONENTS
// ============================================

/**
 * Message Button - for initiating conversations
 */
export function MessageButton({ onClick, disabled, loading, className = '' }) {
  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      loadingText="Opening…"
      leftIcon={!loading && <MessageSquare className="h-4 w-4" aria-hidden="true" />}
      className={className}
      aria-label="Send message"
    >
      Message
    </Button>
  );
}

/**
 * Remove Button - for destructive actions like removing connections
 */
export function RemoveButton({ onClick, disabled, loading, className = '' }) {
  return (
    <Button
      variant="danger"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      loadingText="Removing…"
      leftIcon={!loading && <UserMinus className="h-4 w-4" aria-hidden="true" />}
      // Solid red pill that keeps the same visual on hover
      className={`border border-red-600 bg-red-600 text-white hover:bg-red-600 hover:border-red-600 hover:text-white ${className}`}
      aria-label="Remove connection"
    >
      Remove
    </Button>
  );
}

/**
 * Connect Button - for sending connection requests
 */
export function ConnectButton({ onClick, disabled, loading, success, className = '' }) {
  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      success={success}
      loadingText="Connecting…"
      successText="Request Sent"
      className={className}
      aria-label={success ? "Connection request sent" : "Send connection request"}
    >
      Connect
    </Button>
  );
}

/**
 * Submit Button - for form submissions
 */
export function SubmitButton({ 
  onClick, 
  disabled, 
  loading, 
  success, 
  error,
  children = 'Submit',
  loadingText = 'Submitting…',
  successText = 'Saved!',
  errorText = 'Failed',
  className = '' 
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      success={success}
      error={error}
      loadingText={loadingText}
      successText={successText}
      errorText={errorText}
      className={className}
    >
      {children}
    </Button>
  );
}

/**
 * Cancel Button - for canceling actions
 */
export function CancelButton({ onClick, disabled, className = '' }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      Cancel
    </Button>
  );
}

/**
 * Icon Button - for icon-only buttons with proper accessibility
 */
export function IconButton({ 
  icon, 
  onClick, 
  disabled, 
  loading,
  variant = 'ghost',
  size = 'md',
  'aria-label': ariaLabel,
  className = '' 
}) {
  if (!ariaLabel) {
    logger.warn('IconButton requires an aria-label for accessibility');
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      leftIcon={!loading && icon}
      className={`!p-2 ${className}`}
      aria-label={ariaLabel}
    />
  );
}

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================

export function PrimaryButton({ className = '', children, loading, ...props }) {
  return (
    <Button
      variant="primary"
      loading={loading}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({ className = '', children, loading, ...props }) {
  return (
    <Button
      variant="secondary"
      loading={loading}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
