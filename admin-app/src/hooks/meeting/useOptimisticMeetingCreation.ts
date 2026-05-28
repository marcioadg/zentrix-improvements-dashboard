
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

interface OptimisticMeeting {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  company_id: string;
  meeting_type: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  average_rating?: number;
  total_duration_seconds?: number;
}

export const useOptimisticMeetingCreation = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const queryClient = useQueryClient();
  const [optimisticMeetings, setOptimisticMeetings] = useState<OptimisticMeeting[]>([]);

  const addOptimisticMeeting = useCallback((teamId: string, teamName: string, meetingType: string) => {
    if (!user || !currentCompany) return null;

    const optimisticMeeting: OptimisticMeeting = {
      id: `optimistic-${Date.now()}`,
      team_id: teamId,
      team_name: teamName,
      company_name: currentCompany?.name,
      company_id: currentCompany?.id,
      meeting_type: meetingType,
      current_section: 0,
      started_at: new Date().toISOString(),
      ended_at: null,
      scriber_id: null,
      status: 'active'
    };

    logger.log('✨ Adding optimistic meeting:', optimisticMeeting);
    setOptimisticMeetings(prev => [optimisticMeeting, ...prev]);

    // IMMEDIATE cache invalidation - force refetch right now
    logger.log('🔄 Forcing immediate cache invalidation for meetings');
    queryClient.invalidateQueries({
      queryKey: ['optimized-meetings-data', user.id, currentCompany?.id],
      refetchType: 'active'
    });

    // Also invalidate any related queries
    queryClient.invalidateQueries({
      queryKey: ['all-active-meetings'],
      refetchType: 'active'
    });

    return optimisticMeeting.id;
  }, [user, currentCompany, queryClient]);

  const removeOptimisticMeeting = useCallback((optimisticId: string) => {
    logger.log('🗑️ Removing optimistic meeting:', optimisticId);
    setOptimisticMeetings(prev => prev.filter(m => m.id !== optimisticId));
  }, []);

  const clearOptimisticMeetings = useCallback(() => {
    logger.log('🧹 Clearing all optimistic meetings');
    setOptimisticMeetings([]);
  }, []);

  // Enhanced method to remove optimistic meeting only when real meeting is confirmed
  const confirmRealMeeting = useCallback((realMeetingId: string, teamId: string, meetingType: string) => {
    logger.log('✅ Confirming real meeting exists, removing optimistic versions:', {
      realMeetingId,
      teamId,
      meetingType
    });
    
    setOptimisticMeetings(prev => 
      prev.filter(m => !(m.team_id === teamId && m.meeting_type === meetingType))
    );
  }, []);

  return {
    optimisticMeetings,
    addOptimisticMeeting,
    removeOptimisticMeeting,
    clearOptimisticMeetings,
    confirmRealMeeting
  };
};
