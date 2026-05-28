
import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedMeetingsData } from '@/hooks/meeting/useOptimizedMeetingsData';
import { useOptimizedMeetingSubscriptions } from '@/hooks/meeting/useOptimizedMeetingSubscriptions';
import { useOptimisticMeetingCreation } from '@/hooks/meeting/useOptimisticMeetingCreation';
import { useMeetingOperations } from '@/hooks/meeting/useMeetingOperations';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useMeetingStateBroadcast, BroadcastMeetingData } from '@/hooks/meeting/useMeetingStateBroadcast';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { logger } from '@/lib/logger';

export const useOptimizedActiveMeetings = () => {
  const { meetings, loading, error, refetch } = useOptimizedMeetingsData();
  const { deleteMeeting, finalizeMeeting } = useMeetingOperations();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { 
    optimisticMeetings, 
    addOptimisticMeeting, 
    removeOptimisticMeeting, 
    clearOptimisticMeetings,
    confirmRealMeeting 
  } = useOptimisticMeetingCreation();
  
  // Safely get current company
  let currentCompany = null;
  try {
    const multiCompanyContext = useMultiCompany();
    currentCompany = multiCompanyContext.currentCompany;
  } catch (error) {
    // Context not available - this is normal in some scenarios
  }

  // Get teams to determine teamIds for broadcast
  const { allTeams } = useOptimizedUserTeams();
  const teamIds = useMemo(() => {
    if (!currentCompany) {
      return allTeams.map(team => team.id);
    }
    return allTeams
      .filter(team => team.company_id === currentCompany?.id)
      .map(team => team.id);
  }, [allTeams, currentCompany]);

  // ✅ HIGH-PERFORMANCE SYNC: Handle broadcast with instant local state update
  const handleMeetingBroadcast = useCallback((meetingData?: BroadcastMeetingData, endedTeamId?: string) => {
    logger.log('🔴 [/meetings page] handleMeetingBroadcast received!', { 
      meetingData,
      endedTeamId,
      userId: user?.id,
      companyId: currentCompany?.id,
      teamIdsCount: teamIds.length
    });
    
    // ✅ CRITICAL: Handle meeting ended - instant removal from cache
    if (endedTeamId) {
      logger.debug('useOptimizedActiveMeetings: Instant meeting removal from broadcast', { teamId: endedTeamId });

      if (user) {
        // If currentCompany is unavailable (e.g. context not mounted), fall back to
        // updating ALL optimized-meetings-data caches for this user.
        const cacheEntries = queryClient.getQueryCache().findAll({
          queryKey: currentCompany
            ? ['optimized-meetings-data', user.id, currentCompany?.id]
            : ['optimized-meetings-data', user.id],
        });

        cacheEntries.forEach((entry) => {
          queryClient.setQueryData(entry.queryKey, (old: any[] | undefined) => {
            if (!old) return old;
            return old.filter((m: any) => m.team_id !== endedTeamId);
          });
        });

        queryClient.invalidateQueries({
          queryKey: currentCompany
            ? ['optimized-meetings-data', user.id, currentCompany?.id]
            : ['optimized-meetings-data', user.id],
          refetchType: 'none',
        });

        logger.log('🟢 [/meetings page] Meeting ended - cache updated instantly');
      }

      // Background refetch for eventual consistency
      refetch().catch(err => logger.warn('Background meeting refetch failed:', err));
      return;
    }

    if (meetingData) {
      // INSTANT: Add meeting directly to React Query cache - no DB query needed
      logger.debug('useOptimizedActiveMeetings: Instant meeting sync from broadcast', { meetingId: meetingData.id });

      // Convert broadcast data to meeting format
      // Note: team_name/company_name may be empty from INSERT broadcast - background refetch will enrich
      const fullMeeting = {
        id: meetingData.id,
        team_id: meetingData.team_id,
        team_name: meetingData.team_name || 'Loading...', // Placeholder until refetch enriches
        company_name: meetingData.company_name || '',
        meeting_type: meetingData.meeting_type,
        current_section: meetingData.current_section,
        started_at: meetingData.started_at,
        ended_at: null,
        scriber_id: meetingData.scriber_id,
        status: meetingData.status,
      };

      if (user) {
        const cacheEntries = queryClient.getQueryCache().findAll({
          queryKey: currentCompany
            ? ['optimized-meetings-data', user.id, currentCompany?.id]
            : ['optimized-meetings-data', user.id],
        });

        // If we can't find an existing cache entry (e.g. query never ran yet),
        // still seed the most likely key to ensure observers update instantly.
        const fallbackKey = currentCompany
          ? (['optimized-meetings-data', user.id, currentCompany?.id] as const)
          : (['optimized-meetings-data', user.id] as const);

        const keysToUpdate = cacheEntries.length > 0
          ? cacheEntries.map((e) => e.queryKey)
          : [fallbackKey];

        keysToUpdate.forEach((key) => {
          queryClient.setQueryData(key, (old: any[] | undefined) => {
            const existing = old || [];
            if (existing.some((m: any) => m.id === meetingData.id)) {
              return existing;
            }
            return [fullMeeting, ...existing];
          });
        });

        queryClient.invalidateQueries({
          queryKey: currentCompany
            ? ['optimized-meetings-data', user.id, currentCompany?.id]
            : ['optimized-meetings-data', user.id],
          refetchType: 'none',
        });

        logger.log('🟢 [/meetings page] React Query cache updated and invalidated');
      } else {
        logger.log('🟠 [/meetings page] No user, skipping cache update');
      }
    } else {
      // NO meetingData and NO endedTeamId - just trigger background refetch
      logger.log('🔵 [/meetings page] Broadcast received without meeting data - triggering background refetch');
    }
    
    // Background refetch for eventual consistency (non-blocking)
    refetch().catch(err => logger.warn('Background meeting refetch failed:', err));
  }, [queryClient, user, currentCompany, refetch, teamIds.length]);

  // ✅ CRITICAL: Set up broadcast channels for instant cross-user sync
  const { broadcastMeetingStarted, broadcastMeetingEnded } = useMeetingStateBroadcast(
    currentCompany?.id || null,
    teamIds,
    handleMeetingBroadcast
  );

  useOptimizedMeetingSubscriptions(
    currentCompany, 
    () => refetch().catch(err => logger.warn('Subscription refetch failed:', err)), 
    !loading,
    {
      broadcastMeetingStarted,
      broadcastMeetingEnded
    },
    teamIds // Pass teamIds for fallback filtering when company_id is null
  );

  // Auto-confirm real meetings and remove optimistic ones
  useEffect(() => {
    if (meetings.length > 0 && optimisticMeetings.length > 0) {
      optimisticMeetings.forEach(optimistic => {
        const realMeeting = meetings.find(real => 
          real.team_id === optimistic.team_id && 
          real.meeting_type === optimistic.meeting_type &&
          real.status === 'active'
        );
        
        if (realMeeting) {
          confirmRealMeeting(realMeeting.id, realMeeting.team_id, realMeeting.meeting_type);
        }
      });
    }
  }, [meetings, optimisticMeetings, confirmRealMeeting]);

  // Force immediate refetch callback
  const forceImmediateRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Enhanced optimistic delete function
  const handleDeleteMeeting = useCallback(async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      // Trigger immediate refetch for instant feedback
      await refetch();
    } catch (error) {
      logger.error('🚨 useOptimizedActiveMeetings: Delete error:', error);
      throw error;
    }
  }, [deleteMeeting, refetch]);

  // Enhanced optimistic finalize function
  const handleFinalizeMeeting = useCallback(async (meetingId: string, teamId: string) => {
    try {
      await finalizeMeeting(meetingId, teamId);
      
      // ✅ CRITICAL: Broadcast meeting ended for instant sync across all devices
      broadcastMeetingEnded(teamId);
      
      // Non-blocking refetch
      refetch().catch(err => logger.warn('Background refetch after finalize failed:', err));
    } catch (error) {
      logger.error('🚨 useOptimizedActiveMeetings: Finalize error:', error);
      throw error;
    }
  }, [finalizeMeeting, refetch, broadcastMeetingEnded]);

  // Enhanced add optimistic meeting with simpler signaling
  const handleAddOptimisticMeeting = useCallback((teamId: string, teamName: string, meetingType: string) => {
    const optimisticId = addOptimisticMeeting(teamId, teamName, meetingType);
    
    // Force immediate refetch to catch any real meetings that might have been created
    setTimeout(() => {
      refetch();
    }, 1500);
    
    return optimisticId;
  }, [addOptimisticMeeting, refetch]);

  // Combine real meetings with optimistic meetings, avoiding duplicates
  const allMeetings = useMemo(() => {
    const realMeetings = meetings || [];
    const validOptimisticMeetings = optimisticMeetings.filter(optimistic => {
      // Only include optimistic meeting if no real meeting exists for same team+type
      return !realMeetings.some(real => 
        real.team_id === optimistic.team_id && 
        real.meeting_type === optimistic.meeting_type &&
        real.status === 'active'
      );
    });
    
    return [...validOptimisticMeetings, ...realMeetings];
  }, [meetings, optimisticMeetings]);

  return {
    meetings: allMeetings,
    loading,
    error,
    deleteMeeting: handleDeleteMeeting,
    finalizeMeeting: handleFinalizeMeeting,
    forceRefetch: forceImmediateRefetch,
    // Enhanced optimistic creation methods
    addOptimisticMeeting: handleAddOptimisticMeeting,
    removeOptimisticMeeting
  };
};
