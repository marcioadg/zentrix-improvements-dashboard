import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StrategyMode } from '@/components/tools/DeepStrategy/strategyData';
import { logger } from '@/utils/logger';

interface DeepStrategyResponse {
  id: string;
  user_id: string;
  company_id: string;
  strategy_mode: StrategyMode;
  question_index: number;
  question: string;
  response: string;
  created_at: string;
  updated_at: string;
}

export const useDeepStrategy = (userId: string | null, companyId: string | null) => {
  const [responses, setResponses] = useState<Record<StrategyMode, Record<number, string>>>({
    'pre-revenue': {},
    'scaling': {},
    'plateaued': {}
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load saved responses
  const loadResponses = async () => {
    if (!userId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('deep_strategy_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) throw error;

      const loadedResponses: Record<StrategyMode, Record<number, string>> = {
        'pre-revenue': {},
        'scaling': {},
        'plateaued': {}
      };

      data?.forEach((item: DeepStrategyResponse) => {
        loadedResponses[item.strategy_mode][item.question_index] = item.response;
      });

      setResponses(loadedResponses);
    } catch (error) {
      logger.error('Error loading strategy responses:', error);
      toast({
        title: "Error Loading Responses",
        description: "Failed to load your saved strategy responses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save a response
  const saveResponse = async (
    mode: StrategyMode,
    questionIndex: number,
    question: string,
    response: string
  ) => {
    if (!userId || !companyId) return;

    try {
      const { error } = await supabase
        .from('deep_strategy_responses')
        .upsert({
          user_id: userId,
          company_id: companyId,
          strategy_mode: mode,
          question_index: questionIndex,
          question: question,
          response: response.trim()
        }, {
          onConflict: 'user_id,company_id,strategy_mode,question_index'
        });

      if (error) throw error;

      // Update local state
      setResponses(prev => ({
        ...prev,
        [mode]: {
          ...prev[mode],
          [questionIndex]: response
        }
      }));
    } catch (error) {
      logger.error('Error saving strategy response:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadResponses();
  }, [userId, companyId]);

  return {
    responses,
    loading,
    saveResponse,
    loadResponses
  };
};