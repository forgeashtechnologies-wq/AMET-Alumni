import React from 'react';

// ============================================
// FORM FIELD COMPONENT
// ============================================
// Provides consistent form field styling with:
// - Required/optional indicators
// - Help text (microcopy)
// - Error states
// - Accessibility features

/**
 * FormField - Wrapper for form inputs with consistent styling
 * 
 * @param {Object} props
 * @param {string} props.label - Field label text
 * @param {string} props.htmlFor - ID of the input element
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.helpText - Helper text below the input
 * @param {string} props.error - Error message to display
 * @param {React.ReactNode} props.children - The input element(s)
 * @param {string} props.className - Additional CSS classes
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  helpText,
  error,
  children,
  className = '',
}) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const helpId = helpText ? `${htmlFor}-help` : undefined;
  
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label 
          htmlFor={htmlFor} 
          className="form-label"
        >
          {label}
          {required ? (
            <span className="form-required" aria-hidden="true">*</span>
          ) : (
            <span className="form-optional">(optional)</span>
          )}
        </label>
      )}
      
      {/* Clone children to add aria attributes */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': [errorId, helpId].filter(Boolean).join(' ') || undefined,
            className: `${child.props.className || ''} ${error ? 'form-input-error' : ''}`.trim(),
          });
        }
        return child;
      })}
      
      {/* Help text */}
      {helpText && !error && (
        <p id={helpId} className="form-help">
          {helpText}
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * FormSection - Groups related form fields with a heading
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.description - Section description
 * @param {React.ReactNode} props.children - Form fields
 * @param {string} props.className - Additional CSS classes
 */
export function FormSection({
  title,
  description,
  children,
  className = '',
}) {
  return (
    <fieldset className={`form-section ${className}`}>
      {title && (
        <legend className="form-section-title">
          {title}
        </legend>
      )}
      {description && (
        <p className="form-section-description">
          {description}
        </p>
      )}
      <div className="form-section-content">
        {children}
      </div>
    </fieldset>
  );
}

/**
 * FormActions - Container for form action buttons
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Action buttons
 * @param {string} props.className - Additional CSS classes
 * @param {'left' | 'center' | 'right' | 'between'} props.align - Button alignment
 */
export function FormActions({
  children,
  className = '',
  align = 'right',
}) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`form-actions ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * FormProgress - Shows form completion progress
 * 
 * @param {Object} props
 * @param {number} props.currentStep - Current step (1-indexed)
 * @param {number} props.totalSteps - Total number of steps
 * @param {string[]} props.stepLabels - Labels for each step
 * @param {string} props.className - Additional CSS classes
 */
export function FormProgress({
  currentStep,
  totalSteps,
  stepLabels = [],
  className = '',
}) {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={`form-progress ${className}`} role="group" aria-label="Form progress">
      {/* Progress bar */}
      <div className="form-progress-bar">
        <div 
          className="form-progress-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Step ${currentStep} of ${totalSteps}`}
        />
      </div>
      
      {/* Step indicators */}
      <div className="form-progress-steps">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const label = stepLabels[i] || `Step ${stepNum}`;
          
          return (
            <div 
              key={stepNum}
              className={`form-progress-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="form-progress-step-indicator">
                {isComplete ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span className="form-progress-step-label">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * FormHint - Inline hint/tip for form fields
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Hint content
 * @param {'info' | 'warning' | 'success'} props.variant - Hint style variant
 * @param {string} props.className - Additional CSS classes
 */
export function FormHint({
  children,
  variant = 'info',
  className = '',
}) {
  const variantClasses = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const icons = {
    info: (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`form-hint ${variantClasses[variant]} ${className}`} role="note">
      {icons[variant]}
      <span>{children}</span>
    </div>
  );
}

export default FormField;
