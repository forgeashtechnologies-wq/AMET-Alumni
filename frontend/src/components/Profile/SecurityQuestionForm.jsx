/**
 * SecurityQuestionForm - Component for setting/updating security question
 * Used in Profile Settings for password recovery
 */
import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, QuestionMarkCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useSecurityQuestion, SECURITY_QUESTIONS } from '../../hooks/useSecurityQuestion';

export default function SecurityQuestionForm() {
  const {
    securityQuestion,
    hasSecurityQuestion,
    isLoading,
    isSaving,
    setSecurityQuestion,
  } = useSecurityQuestion();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [confirmAnswer, setConfirmAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [useCustomQuestion, setUseCustomQuestion] = useState(false);
  const [error, setError] = useState('');

  // Reset form when editing mode changes
  useEffect(() => {
    if (!isEditing) {
      setSelectedQuestion('');
      setCustomQuestion('');
      setAnswer('');
      setConfirmAnswer('');
      setShowAnswer(false);
      setUseCustomQuestion(false);
      setError('');
    }
  }, [isEditing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const question = useCustomQuestion ? customQuestion.trim() : selectedQuestion;
    
    if (!question) {
      setError('Please select or enter a security question');
      return;
    }
    if (!answer.trim()) {
      setError('Please enter an answer');
      return;
    }
    if (answer.trim().length < 2) {
      setError('Answer must be at least 2 characters');
      return;
    }
    if (answer !== confirmAnswer) {
      setError('Answers do not match');
      return;
    }

    setSecurityQuestion(
      { question, answer: answer.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-6">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="h-6 w-6 text-ocean-600" />
          <h2 className="text-xl font-semibold text-gray-900">Security Question</h2>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
          >
            {hasSecurityQuestion ? 'Change' : 'Set Up'}
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="text-gray-600">
          {hasSecurityQuestion ? (
            <div className="flex items-start space-x-2">
              <QuestionMarkCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">Your security question is set</p>
                <p className="text-sm text-gray-500 mt-1">
                  "{securityQuestion}"
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  This will be used to verify your identity during password recovery.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Recommended:</strong> Set up a security question for account recovery.
                This provides an additional way to verify your identity if you forget your password.
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Security Question <span className="text-red-500">*</span>
            </label>
            
            {!useCustomQuestion ? (
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="form-select w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              >
                <option value="">Select a question...</option>
                {SECURITY_QUESTIONS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Enter your own security question"
                className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                maxLength={200}
              />
            )}
          </div>

          {/* Answer Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Answer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showAnswer ? 'text' : 'password'}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                className="form-input w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowAnswer(!showAnswer)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showAnswer ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Answer */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Confirm Answer <span className="text-red-500">*</span>
            </label>
            <input
              type={showAnswer ? 'text' : 'password'}
              value={confirmAnswer}
              onChange={(e) => setConfirmAnswer(e.target.value)}
              placeholder="Confirm your answer"
              className="form-input w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Info Note */}
          <p className="text-xs text-gray-500">
            Your answer is case-insensitive and will be securely hashed. Make sure you can remember it exactly.
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Security Question'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
