
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useMeetingSubscriptions } from '@/hooks/meeting/useMeetingSubscriptions';
import { useMeetingStateBroadcast, BroadcastMeetingData } from '@/hooks/meeting/useMeetingStateBroadcast';
import { useMeetingOperations } from '@/hooks/meeting/useMeetingOperations';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { logger } from '@/lib/logger';

interface MeetingWithTeam {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  meeting_type: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  average_rating?: number;
  total_duration_seconds?: number;
}

export const useAllActiveMeetings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { allTeams, loading: teamsLoading, error: teamsError } = useOptimizedUserTeams();
  const { meetings, loadingMeetings, fetchMeetings, addMeetingToCache, removeMeetingFromCache } = useGlobalData();
  
  // Safely get current company, but don't block on it
  let currentCompany = null;
  try {
    const multiCompanyContext = useMultiCompany();
    currentCompany = multiCompanyContext.currentCompany;
  } catch (error) {
    logger.warn('useAllActiveMeetings: MultiCompany context not available, proceeding without company filter');
  }
  
  const { deleteMeeting, finalizeMeeting } = useMeetingOperations();
  
  const [error, setError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefetchRef = useRef<number>(0);
  const lastFetchKeyRef = useRef<string>('');

  // STABLE PRIMITIVE KEYS - prevents re-render loops
  const allTeamsKey = useMemo(() => 
    [...allTeams].map(t => t.id).sort().join(','), 
    [allTeams]
  );
  const currentCompanyId = currentCompany?.id || null;

  // Get team data efficiently - uses stable dependencies
  const getTeamData = useCallback(() => {
    let companyTeams = allTeams;
    
    if (currentCompanyId) {
      companyTeams = allTeams.filter(team => team.company_id === currentCompanyId);
    }
    
    const teamIds = companyTeams.map(team => team.id);
    return { teamIds, companyTeams };
  }, [allTeamsKey, currentCompanyId, allTeams]);

  // Optimized refetch function - reduced rate limiting for real-time updates
  const forceRefetch = useCallback(async () => {
    if (teamsLoading && allTeams.length === 0) return;
    
    // Rate limiting - prevent calls more than once per 500ms (reduced from 2000ms)
    const now = Date.now();
    if (now - lastRefetchRef.current < 500) {
      logger.debug('useAllActiveMeetings: Skipping refetch, too soon');
      return;
    }
    lastRefetchRef.current = now;
    
    logger.debug('useAllActiveMeetings: Force refetching meetings');
    setError(null);
    
    // Don't clear meetings - keep old data visible until new data arrives to prevent flickering
    const { teamIds, companyTeams } = getTeamData();
    
    try {
      await fetchMeetings(teamIds, companyTeams.map(t => ({ ...t, company_name: t.company_id })));
    } catch (error) {
      logger.error('useAllActiveMeetings: Error in forceRefetch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    }
  }, [teamsLoading, allTeamsKey, getTeamData, fetchMeetings]);

  // Keep forceRefetch in a ref to use in effect without creating dependency
  const forceRefetchRef = useRef(forceRefetch);
  useEffect(() => {
    forceRefetchRef.current = forceRefetch;
  }, [forceRefetch]);

  // Trigger fetch on mount and when company/teams change - uses STABLE primitives only
  useEffect(() => {
    if (!teamsLoading || allTeams.length > 0) {
      // Prevent duplicate initial fetches using stable key comparison
      const fetchKey = `${allTeamsKey}-${currentCompanyId}`;
      if (fetchKey !== lastFetchKeyRef.current) {
        lastFetchKeyRef.current = fetchKey;
        forceRefetchRef.current();
      }
    }
  }, [allTeamsKey, currentCompanyId, teamsLoading, allTeams.length]);

  // Get team IDs for subscriptions - uses stable memoized value
  const teamIds = useMemo(() => {
    if (currentCompanyId) {
      return allTeams.filter(team => team.company_id === currentCompanyId).map(team => team.id);
    }
    return allTeams.map(team => team.id);
  }, [allTeamsKey, currentCompanyId, allTeams]);

  // Set up real-time postgres subscriptions
  useMeetingSubscriptions(currentCompany, teamIds, forceRefetch);
  
  // ✅ HIGH-PERFORMANCE SYNC: Handle broadcast with instant local state update
  const handleMeetingBroadcast = useCallback((meetingData?: BroadcastMeetingData, endedTeamId?: string) => {
    if (endedTeamId) {
      // INSTANT: Remove meeting from local state when meeting ends
      logger.debug('useAllActiveMeetings: Instant meeting removal from broadcast', { teamId: endedTeamId });
      removeMeetingFromCache(endedTeamId);
    } else if (meetingData) {
      // INSTANT: Add meeting directly to local state - no DB query needed
      logger.debug('useAllActiveMeetings: Instant meeting sync from broadcast', { meetingId: meetingData.id });
      
      // Convert broadcast data to full meeting format
      const fullMeeting: MeetingWithTeam = {
        id: meetingData.id,
        team_id: meetingData.team_id,
        team_name: meetingData.team_name,
        company_name: meetingData.company_name,
        meeting_type: meetingData.meeting_type,
        current_section: meetingData.current_section,
        started_at: meetingData.started_at,
        ended_at: null,
        scriber_id: meetingData.scriber_id,
        status: meetingData.status,
      };
      
      // Add to local cache for instant UI update
      addMeetingToCache(fullMeeting);
    }
    
    // Background refetch for eventual consistency (non-blocking)
    forceRefetch().catch(err => logger.warn('Background meeting refetch failed:', err));
  }, [addMeetingToCache, removeMeetingFromCache, forceRefetch]);
  
  // Set up broadcast channel for instant cross-user sync
  const { broadcastMeetingStarted, broadcastMeetingEnded } = useMeetingStateBroadcast(
    currentCompany?.id || null,
    teamIds,
    handleMeetingBroadcast
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced delete function that updates local state
  const handleDeleteMeeting = useCallback(async (meetingId: string) => {
    await deleteMeeting(meetingId);
    forceRefetch(); // Refresh data after deletion
  }, [deleteMeeting, forceRefetch]);

  const removeFromOptimizedMeetingsCache = useCallback((endedTeamId: string) => {
    // Keep QuickStartMeetings (useOptimizedActiveMeetings) in sync even if company context is unavailable.
    if (!user) return;

    const queryBase = ['optimized-meetings-data', user.id] as const;
    const queryKey = currentCompany?.id
      ? (['optimized-meetings-data', user.id, currentCompany?.id] as const)
      : queryBase;

    const cacheEntries = queryClient.getQueryCache().findAll({
      queryKey,
    });

    cacheEntries.forEach((entry) => {
      queryClient.setQueryData(entry.queryKey, (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter((m: any) => m.team_id !== endedTeamId);
      });
    });

    queryClient.invalidateQueries({
      queryKey,
      refetchType: 'none',
    });
  }, [queryClient, user, currentCompany?.id]);

  // Enhanced finalize function with proper state management
  const handleFinalizeMeeting = useCallback(async (meetingId: string, teamId: string): Promise<{ companyId?: string | null }> => {
    // ✅ Flow: User → DB (finalizeMeeting) → Realtime (broadcast) → Users (cache updates)
    const result = await finalizeMeeting(meetingId, teamId);

    // INSTANT local removal for /meetings page components
    removeMeetingFromCache(teamId);
    removeFromOptimizedMeetingsCache(teamId);

    // Broadcast meeting ended for instant sync across all participants/devices
    broadcastMeetingEnded(teamId);

    // Non-blocking refetch for eventual consistency
    forceRefetch().catch(err => logger.warn('Background refetch after finalize failed:', err));
    
    // Return company ID for email confirmation dialog
    return result;
  }, [finalizeMeeting, removeMeetingFromCache, removeFromOptimizedMeetingsCache, forceRefetch, broadcastMeetingEnded]);

  return {
    meetings,
    loading: loadingMeetings || (teamsLoading && allTeams.length === 0),
    error: error || teamsError,
    deleteMeeting: handleDeleteMeeting,
    finalizeMeeting: handleFinalizeMeeting,
    forceRefetch,
    broadcastMeetingStarted,
    broadcastMeetingEnded
  };
};
