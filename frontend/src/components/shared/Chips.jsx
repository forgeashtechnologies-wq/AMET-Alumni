import React from 'react';
import { AcademicCapIcon, BuildingOffice2Icon, BriefcaseIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';

// Primary chips: key identity markers (degree, batch) - larger, bolder, colored
const primaryBase = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-semibold shadow-sm';

// Secondary chips: contextual info (dept, company, position) - smaller, subtle, neutral
const secondaryBase = 'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium';

const primaryIconCls = 'h-4 w-4 shrink-0';
const secondaryIconCls = 'h-3.5 w-3.5 shrink-0';

/**
 * TextPill - neutral status indicator (e.g., "Request sent")
 */
export function TextPill({ children, className = '' }) {
  if (!children) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700 ${className}`}>
      {children}
    </span>
  );
}

/**
 * Primary chip - for degree, batch (key identity)
 */
function PrimaryChip({ icon: Icon, children, title, colorClass = 'bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-200/60 text-purple-900' }) {
  if (!children) return null;
  return (
    <span className={`${primaryBase} ${colorClass}`} title={title || (typeof children === 'string' ? children : undefined)}>
      {Icon && <Icon className={`${primaryIconCls} opacity-70`} aria-hidden="true" />}
      <span className="truncate max-w-[180px]">{children}</span>
    </span>
  );
}

/**
 * Secondary chip - for dept, company, position (context)
 */
function SecondaryChip({ icon: Icon, children, title }) {
  if (!children) return null;
  return (
    <span className={`${secondaryBase} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors`} title={title || (typeof children === 'string' ? children : undefined)}>
      {Icon && <Icon className={`${secondaryIconCls} text-slate-400`} aria-hidden="true" />}
      <span className="truncate max-w-[160px]">{children}</span>
    </span>
  );
}

// Exported chip components with appropriate styling
export const DegreeChip = ({ children, primary = false }) => {
  if (primary) {
    // Primary degree chip: neutral outlined style (no colored background)
    return (
      <PrimaryChip
        icon={AcademicCapIcon}
        colorClass="bg-white border border-slate-200 text-slate-900"
      >
        {children}
      </PrimaryChip>
    );
  }
  return <SecondaryChip icon={AcademicCapIcon}>{children}</SecondaryChip>;
};

export const BatchChip = ({ children, primary = false }) => {
  if (primary) {
    return <PrimaryChip colorClass="bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60 text-emerald-900">{children}</PrimaryChip>;
  }
  return <SecondaryChip>{children}</SecondaryChip>;
};

export const DeptChip = ({ children }) => (
  <SecondaryChip icon={BuildingLibraryIcon}>{children}</SecondaryChip>
);

export const CompanyChip = ({ children }) => (
  <SecondaryChip icon={BuildingOffice2Icon}>{children}</SecondaryChip>
);

export const PositionChip = ({ children }) => (
  <SecondaryChip icon={BriefcaseIcon}>{children}</SecondaryChip>
);
