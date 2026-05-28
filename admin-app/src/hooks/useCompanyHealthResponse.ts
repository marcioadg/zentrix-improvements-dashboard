import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { HealthResponse } from './useCompanyHealthAssessments';
import { logger } from '@/utils/logger';

export const useCompanyHealthResponse = (assessmentId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [myResponse, setMyResponse] = useState<HealthResponse | null>(null);
  const [allResponses, setAllResponses] = useState<HealthResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch all responses for this assessment
      const { data, error } = await supabase
        .from('company_health_responses')
        .select('*')
        .eq('assessment_id', assessmentId);

      if (error) throw error;
      
      const responses = (data || []) as HealthResponse[];
      
      // Fetch profiles for all respondents
      const userIds = responses.map(r => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        responses.forEach(r => {
          r.profile = profileMap.get(r.user_id) || undefined;
        });
      }
      
      setAllResponses(responses);
      setMyResponse(responses.find(r => r.user_id === user?.id) || null);
    } catch (error) {
      logger.error('Error fetching health responses:', error);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, user?.id]);

  const saveRatings = useCallback(async (ratings: Record<string, number>) => {
    if (!assessmentId || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('company_health_responses')
        .upsert({
          assessment_id: assessmentId,
          user_id: user.id,
          ratings,
          is_submitted: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'assessment_id,user_id'
        });

      if (error) throw error;
      
      // Optimistic update
      setMyResponse(prev => prev ? { ...prev, ratings } : {
        id: 'temp',
        assessment_id: assessmentId,
        user_id: user.id,
        ratings,
        is_submitted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error saving ratings:', error);
    }
  }, [assessmentId, user?.id]);

  const submitRatings = useCallback(async (ratings: Record<string, number>) => {
    if (!assessmentId || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('company_health_responses')
        .upsert({
          assessment_id: assessmentId,
          user_id: user.id,
          ratings,
          is_submitted: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'assessment_id,user_id'
        });

      if (error) throw error;
      
      toast({
        title: "Assessment Submitted",
        description: "Your ratings have been recorded."
      });
      
      await fetchResponses();
    } catch (error) {
      logger.error('Error submitting ratings:', error);
      toast({
        title: "Error",
        description: "Failed to submit assessment",
        variant: "destructive"
      });
    }
  }, [assessmentId, user?.id, fetchResponses, toast]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  // Real-time subscription
  useEffect(() => {
    if (!assessmentId) return;
    
    const channel = supabase
      .channel(`health-responses-${assessmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_health_responses',
          filter: `assessment_id=eq.${assessmentId}`
        },
        () => {
          fetchResponses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assessmentId, fetchResponses]);

  return {
    myResponse,
    allResponses,
    loading,
    saveRatings,
    submitRatings,
    refetch: fetchResponses
  };
};
