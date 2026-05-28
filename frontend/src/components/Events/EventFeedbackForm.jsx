/**
 * EventFeedbackForm - Detailed feedback form for events
 * Includes multiple rating dimensions and text feedback
 */
import React, { useState, useEffect } from 'react';
import {
  StarIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useEventFeedback, RATING_FIELDS, INTEREST_LEVELS } from '../../hooks/useEventFeedback';

// Star Rating Component
function StarRating({ value, onChange, disabled = false, size = 'md' }) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className={`${disabled ? 'cursor-default' : 'cursor-pointer'} focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1 rounded`}
          aria-label={`Rate ${star} out of 5`}
        >
          {(hoverValue || value) >= star ? (
            <StarIconSolid className={`${sizeClasses[size]} text-yellow-400`} />
          ) : (
            <StarIcon className={`${sizeClasses[size]} text-gray-300`} />
          )}
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600">{value}/5</span>
      )}
    </div>
  );
}

export default function EventFeedbackForm({ eventId, eventTitle, onSuccess }) {
  const {
    myFeedback,
    hasSubmittedFeedback,
    isLoadingMyFeedback,
    isSubmitting,
    submitFeedback,
    ratingFields,
    interestLevels,
  } = useEventFeedback(eventId);

  const [formData, setFormData] = useState({
    overall_rating: 0,
    content_rating: 0,
    speakers_rating: 0,
    logistics_rating: 0,
    venue_rating: 0,
    communication_rating: 0,
    worked_well: '',
    could_improve: '',
    future_suggestions: '',
    interest_level: '',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Pre-fill form if user has already submitted feedback
  useEffect(() => {
    if (myFeedback) {
      setFormData({
        overall_rating: myFeedback.overall_rating || 0,
        content_rating: myFeedback.content_rating || 0,
        speakers_rating: myFeedback.speakers_rating || 0,
        logistics_rating: myFeedback.logistics_rating || 0,
        venue_rating: myFeedback.venue_rating || 0,
        communication_rating: myFeedback.communication_rating || 0,
        worked_well: myFeedback.worked_well || '',
        could_improve: myFeedback.could_improve || '',
        future_suggestions: myFeedback.future_suggestions || '',
        interest_level: myFeedback.interest_level || '',
      });
    }
  }, [myFeedback]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.overall_rating < 1) {
      return;
    }

    submitFeedback(formData, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        onSuccess?.();
      },
    });
  };

  const handleRatingChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoadingMyFeedback) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ocean-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading feedback form...</p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="p-8 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
        <p className="text-gray-600">Your feedback has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-2">
          <ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-ocean-600" />
          <h2 className="text-xl font-semibold text-gray-900">Event Feedback</h2>
        </div>
        {eventTitle && (
          <p className="text-sm text-gray-600 mt-1">{eventTitle}</p>
        )}
        {hasSubmittedFeedback && (
          <p className="text-sm text-ocean-600 mt-2">
            You've already submitted feedback. Editing is disabled.
          </p>
        )}
      </div>

      {/* Overall Rating - Required */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Overall Experience <span className="text-red-500">*</span>
        </label>
        <StarRating
          value={formData.overall_rating}
          onChange={(v) => handleRatingChange('overall_rating', v)}
          disabled={hasSubmittedFeedback}
          size="lg"
        />
        {formData.overall_rating === 0 && !hasSubmittedFeedback && (
          <p className="text-xs text-gray-500">Please rate your overall experience</p>
        )}
      </div>

      {/* Detailed Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ratingFields.filter(f => f.key !== 'overall_rating').map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <StarRating
              value={formData[field.key]}
              onChange={(v) => handleRatingChange(field.key, v)}
              disabled={hasSubmittedFeedback}
              size="sm"
            />
          </div>
        ))}
      </div>

      {/* Text Feedback */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            What worked well?
          </label>
          <textarea
            value={formData.worked_well}
            onChange={(e) => setFormData((prev) => ({ ...prev, worked_well: e.target.value }))}
            placeholder="Share what you enjoyed about the event..."
            rows={3}
            className="form-textarea w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            maxLength={1000}
            disabled={hasSubmittedFeedback}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            What could be improved?
          </label>
          <textarea
            value={formData.could_improve}
            onChange={(e) => setFormData((prev) => ({ ...prev, could_improve: e.target.value }))}
            placeholder="Share constructive suggestions for improvement..."
            rows={3}
            className="form-textarea w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            maxLength={1000}
            disabled={hasSubmittedFeedback}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Suggestions for future events
          </label>
          <textarea
            value={formData.future_suggestions}
            onChange={(e) => setFormData((prev) => ({ ...prev, future_suggestions: e.target.value }))}
            placeholder="Topics, formats, or activities you'd like to see..."
            rows={2}
            className="form-textarea w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            maxLength={500}
            disabled={hasSubmittedFeedback}
          />
        </div>
      </div>

      {/* Interest Level */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Interest in similar events
        </label>
        <div className="flex flex-wrap gap-2">
          {interestLevels.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => !hasSubmittedFeedback && setFormData((prev) => ({ ...prev, interest_level: level.value }))}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                formData.interest_level === level.value
                  ? 'bg-ocean-100 border-ocean-500 text-ocean-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={hasSubmittedFeedback}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      {!hasSubmittedFeedback && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={formData.overall_rating < 1 || isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      )}
    </form>
  );
}
