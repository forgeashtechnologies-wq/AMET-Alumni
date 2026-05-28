import React from 'react';

// Allowed: letters, numbers, spaces, & / ( ) - .  and must start with a letter, total 2–60 chars
// Put '-' at the end of the class to avoid the need to escape
const DEPT_REGEX = /^[A-Za-z][A-Za-z0-9 .&()/-]{1,59}$/;

export function isValidDepartment(s) {
  if (!s) return false;
  const t = String(s).trim();
  return DEPT_REGEX.test(t);
}

export default function DepartmentInput({
  value,
  onChange,
  required = true,
  disabled = false,
  label = 'Department',
  placeholder = 'e.g., Marine, ECE, Naval Architecture'
}) {
  const ok = value ? isValidDepartment(value) : !required;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${ok ? 'border-gray-300 focus:ring-ocean-500' : 'border-red-500 focus:ring-red-300'}`}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      />
      {!ok && (
        <p className="mt-1 text-xs text-red-500">Letters, numbers, spaces, & / ( ) - . only, 2–60 chars.</p>
      )}
    </div>
  );
}
