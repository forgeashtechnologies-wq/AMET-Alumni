/**
 * AdditionalDegreesForm - Component for managing multiple degrees
 * Allows users to add additional degrees beyond their primary one
 */
import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useProfileDegrees } from '../../hooks/useProfileDegrees';

export default function AdditionalDegreesForm() {
  const {
    degrees,
    primaryDegree,
    additionalDegrees,
    isLoading,
    isSaving,
    isDeleting,
    addDegree,
    updateDegree,
    deleteDegree,
    setPrimaryDegree,
  } = useProfileDegrees();

  const [isAdding, setIsAdding] = useState(false);
  const [newDegree, setNewDegree] = useState({
    degree_code: '',
    institution_name: '',
    graduation_year: '',
  });
  const [editingId, setEditingId] = useState(null);

  const handleSaveDegree = () => {
    if (!newDegree.degree_code) return;

    const payload = {
      ...newDegree,
      is_primary: false, // Additional degrees are never primary; primary is managed above
    };

    if (editingId) {
      updateDegree({ id: editingId, ...payload });
    } else {
      addDegree(payload);
    }

    setNewDegree({ degree_code: '', institution_name: '', graduation_year: '' });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleDeleteDegree = (degreeId) => {
    if (window.confirm('Are you sure you want to remove this degree?')) {
      deleteDegree(degreeId);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Additional Degrees (optional)</h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center text-xs font-medium text-ocean-600 hover:text-ocean-700"
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Add degree
          </button>
        )}
      </div>

      {/* Existing Degrees List (non-primary only) */}
      {additionalDegrees.length > 0 ? (
        <div className="space-y-3 mb-3">
          {additionalDegrees.map((degree) => (
            <div
              key={degree.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
            >
              <div className="flex items-start space-x-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {degree.degree_code}
                  </p>
                  {degree.institution_name && (
                    <p className="text-sm text-gray-600">{degree.institution_name}</p>
                  )}
                  {degree.graduation_year && (
                    <p className="text-xs text-gray-500">Class of {degree.graduation_year}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setEditingId(degree.id);
                    setNewDegree({
                      degree_code: degree.degree_code || '',
                      institution_name: degree.institution_name || '',
                      graduation_year: degree.graduation_year || '',
                    });
                  }}
                  disabled={isSaving}
                  className="text-xs font-medium text-ocean-600 hover:text-ocean-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDegree(degree.id)}
                  disabled={isDeleting}
                  className="text-gray-400 hover:text-red-500 p-1 rounded-full"
                  title="Remove degree"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-3">
          No additional degrees added yet.
        </p>
      )}

      {/* Add New Degree Form */}
      {isAdding && (
        <div className="border-t border-gray-200 pt-3 mt-3 space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Add another degree</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Degree / Qualification <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDegree.degree_code}
                onChange={(e) =>
                  setNewDegree((prev) => ({ ...prev, degree_code: e.target.value }))
                }
                placeholder="e.g., MBA in Finance"
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Program / Institution
              </label>
              <input
                type="text"
                value={newDegree.institution_name}
                onChange={(e) =>
                  setNewDegree((prev) => ({ ...prev, institution_name: e.target.value }))
                }
                placeholder="e.g., AMET University"
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Graduation Year
              </label>
              <input
                type="number"
                value={newDegree.graduation_year}
                onChange={(e) =>
                  setNewDegree((prev) => ({ ...prev, graduation_year: e.target.value }))
                }
                min="1950"
                max={new Date().getFullYear() + 6}
                placeholder="e.g., 2024"
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setNewDegree({ degree_code: '', institution_name: '', graduation_year: '' });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDegree}
              disabled={!newDegree.degree_code || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : editingId ? 'Save Degree' : 'Add Degree'}
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-3">
        Your primary degree is managed above. Use this section to list any additional degrees or programs you have completed.
      </p>
    </div>
  );
}
