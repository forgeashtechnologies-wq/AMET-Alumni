import React, { useId } from 'react';
import { useAcademicsCatalog } from '../../hooks/useAcademicsCatalog';

export default function DepartmentSelect({ degreeCode, value, onChange, disabled, required, label = 'Department', id, error }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const { getDepartments, loading, error: loadError } = useAcademicsCatalog();

  const deps = degreeCode ? getDepartments(degreeCode) : [];
  const isDisabled = disabled || loading || !degreeCode;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {loadError && (
        <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
          Couldn't load department data. Please retry.
        </div>
      )}
      <select
        id={inputId}
        aria-required={!!required}
        aria-invalid={!!error}
        className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 bg-white ${error ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-ocean-500'}`}
        disabled={isDisabled}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>{!degreeCode ? 'Select degree first...' : (loading ? 'Loading departments…' : 'Select department...')}</option>
        {deps.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {!disabled && !isDisabled && (
        <p className="mt-1 text-xs text-gray-500">Options are based on the selected degree.</p>
      )}
    </div>
  );
}
