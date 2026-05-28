import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface HealthAssessment {
  id: string;
  company_id: string;
  title: string;
  assessment_date: string;
  status: 'active' | 'completed';
  overall_score: number | null;
  respondent_count: number;
  created_by: string;
  created_at: string;
  closed_at: string | null;
}

export interface HealthResponse {
  id: string;
  assessment_id: string;
  user_id: string;
  ratings: Record<string, number>;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useCompanyHealthAssessments = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<HealthAssessment[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<HealthAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = useCallback(async () => {
    if (!currentCompany?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_health_assessments')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('assessment_date', { ascending: false });

      if (error) throw error;
      
      const typed = (data || []) as HealthAssessment[];
      setAssessments(typed);
      setActiveAssessment(typed.find(a => a.status === 'active') || null);
    } catch (error) {
      logger.error('Error fetching health assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  const createAssessment = useCallback(async (title: string) => {
    if (!currentCompany?.id || !user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('company_health_assessments')
        .insert({
          company_id: currentCompany?.id,
          title,
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Assessment Started",
        description: "Share the link with your team to begin collecting responses."
      });
      
      await fetchAssessments();
      return data as HealthAssessment;
    } catch (error) {
      logger.error('Error creating assessment:', error);
      toast({
        title: "Error",
        description: "Failed to create assessment",
        variant: "destructive"
      });
      return null;
    }
  }, [currentCompany?.id, user?.id, fetchAssessments, toast]);

  const closeAssessment = useCallback(async (assessmentId: string, overallScore: number, respondentCount: number) => {
    try {
      const { error } = await supabase
        .from('company_health_assessments')
        .update({
          status: 'completed',
          closed_at: new Date().toISOString(),
          overall_score: overallScore,
          respondent_count: respondentCount
        })
        .eq('id', assessmentId);

      if (error) throw error;
      
      toast({
        title: "Assessment Completed",
        description: "Results have been saved to history."
      });
      
      await fetchAssessments();
    } catch (error) {
      logger.error('Error closing assessment:', error);
      toast({
        title: "Error",
        description: "Failed to close assessment",
        variant: "destructive"
      });
    }
  }, [fetchAssessments, toast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  return {
    assessments,
    activeAssessment,
    loading,
    createAssessment,
    closeAssessment,
    refetch: fetchAssessments
  };
};
