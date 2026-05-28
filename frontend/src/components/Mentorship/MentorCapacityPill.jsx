import React from 'react';

/**
 * MentorCapacityPill - Reusable capacity indicator for mentors
 * Shows accepting/at capacity/not accepting state with consistent styling
 * 
 * @param {number} current - Current number of mentees
 * @param {number} max - Maximum number of mentees
 * @param {boolean} isAvailable - Whether mentor is accepting new mentees
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 */
export default function MentorCapacityPill({ 
  current = 0, 
  max = 0, 
  isAvailable = false,
  size = 'md'
}) {
  // Determine state
  const hasLimit = typeof max === 'number' && max > 0;
  const atCapacity = hasLimit && current >= max;
  const accepting = isAvailable && !atCapacity;
  const notAccepting = !isAvailable;

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // State-based styling
  let bgColor, textColor, label, icon;

  if (accepting) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    label = hasLimit
      ? `Accepting trainees (${current}/${max})`
      : `Accepting trainees (${current})`;
    icon = '✓';
  } else if (atCapacity) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
    label = `At capacity (${current}/${max})`;
    icon = '⚠';
  } else {
    bgColor = 'bg-gray-100';
    textColor = 'text-gray-800';
    label = 'Not accepting new trainees';
    icon = '—';
  }

  return (
    <span 
      className={`inline-flex items-center gap-1.5 ${bgColor} ${textColor} ${sizeClasses[size]} rounded-full font-medium`}
      role="status"
      aria-label={label}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
