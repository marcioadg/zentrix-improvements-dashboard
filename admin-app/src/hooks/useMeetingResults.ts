
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface MeetingResult {
  id: string;
  meeting_id: string;
  team_id: string | null; // Nullable for member meetings
  company_id?: string | null; // For member meetings
  headlines_created: any[];
  tasks_created: any[];
  issues_resolved: any[];
  goals_created: any[];
  metrics_created: any[];
  section_durations: Record<number, number>;
  total_duration_seconds: number;
  attendees: any[];
  meeting_ratings: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export const useMeetingResults = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getMeetingResults = useCallback(async (meetingId: string): Promise<MeetingResult | null> => {
    setLoading(true);
    try {
      logger.log('useMeetingResults: Fetching meeting results for meeting:', meetingId);

      const { data, error } = await supabase
        .from('meeting_results')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No results found - this is normal for some meetings
          logger.log('useMeetingResults: No meeting results found for meeting:', meetingId);
          return null;
        }
        logger.error('useMeetingResults: Error fetching meeting results:', error);
        throw error;
      }

      logger.log('useMeetingResults: Meeting results fetched successfully:', data);
      return data as MeetingResult;
    } catch (error) {
      logger.error('useMeetingResults: Failed to fetch meeting results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch meeting results.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveMeetingResults = useCallback(async (
    resultData: {
      meeting_id: string;
      team_id: string | null; // Nullable for member meetings
      company_id?: string | null; // For member meetings
      headlines_created?: any[];
      tasks_created?: any[];
      issues_resolved?: any[];
      goals_created?: any[];
      metrics_created?: any[];
      section_durations?: Record<number, number>;
      total_duration_seconds?: number;
      attendees?: any[];
      meeting_ratings?: Record<string, number>;
    },
    context: string = 'meeting_end'
  ) => {
    setLoading(true);
    try {
      logger.log('useMeetingResults: Saving meeting results with UPSERT logic:', resultData);

      // Use UPSERT logic - INSERT with ON CONFLICT DO UPDATE
      const { data, error } = await supabase
        .from('meeting_results')
        .upsert({
          meeting_id: resultData.meeting_id,
          team_id: resultData.team_id, // Can be NULL for member meetings
          company_id: resultData.company_id || null, // For member meetings
          headlines_created: resultData.headlines_created || [],
          tasks_created: resultData.tasks_created || [],
          issues_resolved: resultData.issues_resolved || [],
          goals_created: resultData.goals_created || [],
          metrics_created: resultData.metrics_created || [],
          section_durations: resultData.section_durations || {},
          total_duration_seconds: resultData.total_duration_seconds || 0,
          attendees: resultData.attendees || [],
          meeting_ratings: resultData.meeting_ratings || {}
        }, {
          onConflict: 'meeting_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        logger.error('useMeetingResults: Error saving meeting results:', error);
        throw error;
      }

      logger.log('useMeetingResults: Meeting results saved/updated successfully:', data);
      return data;
    } catch (error) {
      logger.error(`useMeetingResults: Failed to save meeting results [${context}]:`, error);
      
      // Don't show toast for meeting_end context - let finalizeMeeting handle user feedback
      // This prevents duplicate/confusing toasts during meeting finalization
      if (context !== 'meeting_end') {
        toast({
          title: "Error",
          description: "Failed to save meeting results.",
          variant: "destructive",
        });
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAllMeetingResults = useCallback(async (teamId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_results')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching meeting results:', error);
        throw error;
      }

      return data as MeetingResult[];
    } catch (error) {
      logger.error('useMeetingResults: Failed to fetch meeting results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch meeting results.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    saveMeetingResults,
    getMeetingResults,
    fetchAllMeetingResults,
    loading
  };
};
