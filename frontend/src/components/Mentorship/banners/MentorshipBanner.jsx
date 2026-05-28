import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Generic banner component for mentorship status messages.
 * Supports different variants (info, success, warning, danger) and role contexts.
 */
export default function MentorshipBanner({
  variant = 'info',
  role,
  title,
  body,
  primaryCta,
  secondaryCta,
}) {
  const navigate = useNavigate();
  
  const variantStyles = {
    info: 'border-slate-200 bg-white text-slate-900',
    success: 'border-slate-200 bg-white text-slate-900',
    warning: 'border-slate-200 bg-white text-slate-900',
    danger: 'border-slate-200 bg-white text-slate-900',
  };
  
  const handleCtaClick = (cta) => {
    if (cta.onClick) {
      cta.onClick();
    } else if (cta.to) {
      navigate(cta.to);
    }
  };
  
  return (
    <div
      className={clsx(
        'rounded-lg border px-4 py-3',
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        variantStyles[variant]
      )}
      role="alert"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {role && (
            <span className="inline-flex items-center rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium">
              {role === 'mentee' && '🎓 Mentee'}
              {role === 'mentor' && '👨‍🏫 Mentor'}
              {role === 'both' && '🎓👨‍🏫 Both'}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            {body && (
              <p className="mt-1 text-sm text-slate-700">{body}</p>
            )}
          </div>
        </div>
      </div>
      
      {(primaryCta || secondaryCta) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryCta && (
            <button
              onClick={() => handleCtaClick(secondaryCta)}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-white/60 hover:bg-white/80 transition-colors"
            >
              {secondaryCta.label}
            </button>
          )}
          {primaryCta && (
            <button
              onClick={() => handleCtaClick(primaryCta)}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold bg-white hover:bg-white/90 transition-colors shadow-sm"
            >
              {primaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
