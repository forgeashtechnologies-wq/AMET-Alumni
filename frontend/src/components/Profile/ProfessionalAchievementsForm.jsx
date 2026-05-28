/**
 * ProfessionalAchievementsForm - Component for managing professional achievements
 * Awards, Publications, Patents, Certifications
 */
import React, { useState } from 'react';
import {
  TrophyIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  LinkIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useProfileAchievements, ACHIEVEMENT_CATEGORIES } from '../../hooks/useProfileAchievements';

const CATEGORY_ICONS = {
  award: '🏆',
  publication: '📄',
  patent: '💡',
  certification: '🎓',
};

export default function ProfessionalAchievementsForm() {
  const {
    achievements,
    achievementsByCategory,
    isLoading,
    isSaving,
    isDeleting,
    addAchievement,
    updateAchievement,
    deleteAchievement,
  } = useProfileAchievements();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category: 'award',
    title: '',
    issuer: '',
    date_awarded: '',
    url: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      category: 'award',
      title: '',
      issuer: '',
      date_awarded: '',
      url: '',
      description: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category || !formData.title.trim()) return;

    if (editingId) {
      updateAchievement({ ...formData, id: editingId });
    } else {
      addAchievement(formData);
    }
    resetForm();
  };

  const handleEdit = (achievement) => {
    setFormData({
      category: achievement.category,
      title: achievement.title || '',
      issuer: achievement.issuer || achievement.organization || '',
      date_awarded: achievement.date_awarded || (achievement.year ? `${achievement.year}-01-01` : ''),
      url: achievement.url || '',
      description: achievement.description || '',
    });
    setEditingId(achievement.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this achievement?')) {
      deleteAchievement(id);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <TrophyIcon className="h-6 w-6 text-ocean-600" />
          <h2 className="text-xl font-semibold text-gray-900">Professional Achievements</h2>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center text-sm text-ocean-600 hover:text-ocean-700 font-medium"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Achievement
          </button>
        )}
      </div>

      {/* Achievements by Category */}
      {achievements.length > 0 ? (
        <div className="space-y-6 mb-4">
          {ACHIEVEMENT_CATEGORIES.map((cat) => {
            const catAchievements = achievementsByCategory[cat.value] || [];
            if (catAchievements.length === 0) return null;

            return (
              <div key={cat.value}>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">{CATEGORY_ICONS[cat.value]}</span>
                  {cat.label}s ({catAchievements.length})
                </h3>
                <div className="space-y-2">
                  {catAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-start justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{achievement.title}</p>
                        {(achievement.issuer || achievement.organization) && (
                          <p className="text-sm text-gray-600">{achievement.issuer || achievement.organization}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                          {(achievement.date_awarded || achievement.year) && (
                            <span className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {achievement.date_awarded
                                ? new Date(achievement.date_awarded).toLocaleDateString()
                                : achievement.year}
                            </span>
                          )}
                          {achievement.url && (
                            <a
                              href={achievement.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-ocean-600 hover:text-ocean-700"
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              View
                            </a>
                          )}
                        </div>
                        {achievement.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {achievement.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(achievement)}
                          className="p-1 text-gray-400 hover:text-ocean-600"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(achievement.id)}
                          disabled={isDeleting}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          No achievements added yet. Showcase your awards, publications, patents, and certifications.
        </p>
      )}

      {/* Add/Edit Form (no nested <form> to avoid conflicts with outer profile form) */}
      {isAdding && (
        <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            {editingId ? 'Edit Achievement' : 'Add New Achievement'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="form-select w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              >
                {ACHIEVEMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {CATEGORY_ICONS[cat.value]} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Best Paper Award"
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                required
              />
            </div>

            {/* Issuer */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Issuing Organization
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData((prev) => ({ ...prev, issuer: e.target.value }))}
                placeholder="e.g., IEEE, Google, etc."
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Date Awarded
              </label>
              <input
                type="date"
                value={formData.date_awarded}
                onChange={(e) => setFormData((prev) => ({ ...prev, date_awarded: e.target.value }))}
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              />
            </div>

            {/* URL */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Link/URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the achievement..."
                rows={2}
                className="form-textarea w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formData.title.trim() || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Add Achievement'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
