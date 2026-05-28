/**
 * Hook for managing security questions for password recovery
 * Uses RPCs: set_my_security_question, get_my_security_question, verify_my_security_answer
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

// Predefined security questions
export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?",
  "What was the make of your first car?",
  "What is the name of the street you grew up on?",
  "What is your favorite book?",
];

export function useSecurityQuestion() {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch current security question (without the answer hash)
  const {
    data: securityQuestion,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['security-question'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_security_question');
      if (error) throw error;
      return data; // { question: string } or null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set or update security question
  const setSecurityQuestionMutation = useMutation({
    mutationFn: async ({ question, answer }) => {
      if (!question || !answer) {
        throw new Error('Question and answer are required');
      }
      if (answer.trim().length < 2) {
        throw new Error('Answer must be at least 2 characters');
      }
      const { data, error } = await supabase.rpc('set_my_security_question', {
        p_question: question,
        p_answer_plaintext: answer.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-question'] });
      toast.success('Security question saved successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save security question');
    },
  });

  // Verify security answer (for password reset flow)
  const verifyAnswer = useCallback(async (answer) => {
    if (!answer) {
      toast.error('Please enter your answer');
      return false;
    }
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.rpc('verify_my_security_answer', {
        p_answer_plaintext: answer.trim(),
      });
      if (error) throw error;
      
      const result = data;
      if (result?.success) {
        toast.success('Answer verified successfully');
        return true;
      } else {
        toast.error(result?.error || 'Incorrect answer');
        return false;
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    // Data
    securityQuestion: securityQuestion?.question || null,
    hasSecurityQuestion: !!securityQuestion?.question,
    
    // Loading states
    isLoading,
    isVerifying,
    isSaving: setSecurityQuestionMutation.isPending,
    
    // Error
    error,
    
    // Actions
    setSecurityQuestion: setSecurityQuestionMutation.mutate,
    verifyAnswer,
    refetch,
  };
}

export default useSecurityQuestion;
