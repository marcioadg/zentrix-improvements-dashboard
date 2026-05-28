import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export interface Assessment {
  id: string;
  meeting_state_id: string;
  user_id: string;
  ratings: Record<string, number>;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentWithProfile extends Assessment {
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export const useCompanyAssessment = (meetingStateId: string | null) => {
  const { user } = useAuth();
  const [myAssessment, setMyAssessment] = useState<Assessment | null>(null);
  const [allAssessments, setAllAssessments] = useState<AssessmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all assessments for this meeting
  const fetchAssessments = useCallback(async () => {
    if (!meetingStateId) return;

    try {
      const { data, error } = await supabase
        .from('meeting_company_assessments')
        .select('*')
        .eq('meeting_state_id', meetingStateId);

      if (error) throw error;

      // Fetch profiles for all users
      const userIds = data?.map(a => a.user_id) || [];
      let profiles: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);
        
        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      const assessmentsWithProfiles = (data || []).map(a => ({
        ...a,
        profile: profiles[a.user_id]
      })) as AssessmentWithProfile[];

      setAllAssessments(assessmentsWithProfiles);
      
      // Find my assessment
      const mine = assessmentsWithProfiles.find(a => a.user_id === user?.id);
      setMyAssessment(mine || null);
    } catch (error) {
      logger.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [meetingStateId, user?.id]);

  // Save ratings (upsert)
  const saveRatings = useCallback(async (ratings: Record<string, number>) => {
    if (!meetingStateId || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('meeting_company_assessments')
        .upsert({
          meeting_state_id: meetingStateId,
          user_id: user.id,
          ratings,
          is_submitted: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_state_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      setMyAssessment(data as Assessment);
      return data;
    } catch (error) {
      logger.error('Error saving ratings:', error);
      throw error;
    }
  }, [meetingStateId, user?.id]);

  // Submit assessment with optimistic update
  const submitAssessment = useCallback(async (ratings: Record<string, number>): Promise<AssessmentWithProfile | undefined> => {
    if (!meetingStateId || !user?.id) return;

    // Get current user profile for optimistic update
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single();

    try {
      const { data, error } = await supabase
        .from('meeting_company_assessments')
        .upsert({
          meeting_state_id: meetingStateId,
          user_id: user.id,
          ratings,
          is_submitted: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_state_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      const assessmentWithProfile: AssessmentWithProfile = {
        ...(data as Assessment),
        profile: profileData || undefined
      };
      
      setMyAssessment(data as Assessment);
      
      // Optimistically update allAssessments
      setAllAssessments(prev => {
        const existing = prev.findIndex(a => a.user_id === user.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = assessmentWithProfile;
          return updated;
        }
        return [...prev, assessmentWithProfile];
      });
      
      return assessmentWithProfile;
    } catch (error) {
      logger.error('Error submitting assessment:', error);
      throw error;
    }
  }, [meetingStateId, user?.id]);

  // Add remote assessment optimistically
  const addRemoteAssessment = useCallback((assessment: AssessmentWithProfile) => {
    setAllAssessments(prev => {
      const existing = prev.findIndex(a => a.user_id === assessment.user_id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = assessment;
        return updated;
      }
      return [...prev, assessment];
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  return {
    myAssessment,
    allAssessments,
    loading,
    saveRatings,
    submitAssessment,
    addRemoteAssessment,
    refetch: fetchAssessments
  };
};
