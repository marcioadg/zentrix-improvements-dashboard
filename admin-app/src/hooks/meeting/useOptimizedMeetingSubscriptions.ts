
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimisticMeetingEnd } from '@/contexts/OptimisticMeetingEndContext';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';

import { BroadcastMeetingData } from '@/hooks/meeting/useMeetingStateBroadcast';

export const useOptimizedMeetingSubscriptions = (
  currentCompany: { id: string } | null,
  onMeetingChange: () => void,
  enabled: boolean = true,
  broadcastFunctions?: {
    broadcastMeetingStarted?: (teamId: string, meetingType: string, meetingData?: BroadcastMeetingData) => void;
    broadcastMeetingEnded?: (teamId: string) => void;
  },
  teamIds?: string[] // NEW: Allow filtering by team_id as fallback when company_id is null
) => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isEndingMeeting, isLeavingMeeting, processingMeetingId } = useOptimisticMeetingEnd();
  const { isInProtectionPeriod } = useMeetingEndState();

  // ✅ CRITICAL: Immediate callback for status changes (start/end meetings)
  // This ensures all users see meeting start/end instantly, regardless of local transitions
  const immediateStatusChangeRefetch = useCallback((payload: any) => {
    const oldStatus = payload.old?.status;
    const newStatus = payload.new?.status;
    const oldCompanyId = payload.old?.company_id;
    const newCompanyId = payload.new?.company_id;
    const meetingId = payload.new?.id || payload.old?.id;

    // ✅ CRITICAL: Check if this is a status change (active ↔ ended)
    const isStatusChange = oldStatus !== newStatus && 
      (oldStatus === 'active' || oldStatus === 'ended') &&
      (newStatus === 'active' || newStatus === 'ended');

    // ✅ CRITICAL: Check if this meeting belongs to current company
    // Note: All meetings should have company_id (backfilled via migration 20251024222154)
    // For team meetings: company_id is set directly in meetings_state
    // For member meetings: company_id is set directly in meetings_state
    // Fallback: Also check via team_id for team meetings
    const teamId = payload.new?.team_id || payload.old?.team_id;
    const belongsToCurrentCompanyDirectly = 
      (newCompanyId === currentCompany?.id) || 
      (oldCompanyId === currentCompany?.id);
    const belongsViaTeamId = teamId && teamIds?.includes(teamId);
    const belongsToCurrentCompany = belongsToCurrentCompanyDirectly || belongsViaTeamId;

    // Only process if it's a status change AND belongs to current company
    if (!isStatusChange || !belongsToCurrentCompany || !currentCompany) {
      return false; // Not a status change we care about
    }

    // ✅ CRITICAL: Always process status changes from other users immediately
    // Don't skip even during local transitions - other users' changes should always show

    // ✅ CRITICAL: Send broadcast for instant sync (same as header button)
    // This ensures all users see the change immediately via broadcast channels
    const meetingType = payload.new?.meeting_type || payload.old?.meeting_type;
    
    if (teamId && meetingType) {
      if (newStatus === 'active' && broadcastFunctions?.broadcastMeetingStarted) {
        // Build meeting data from the postgres payload for instant sync
        const meetingData = {
          id: meetingId,
          team_id: teamId,
          team_name: '', // Will be enriched by receiver's background refetch
          company_name: '', // Will be enriched by receiver's background refetch
          meeting_type: meetingType,
          current_section: payload.new?.current_section || 0,
          started_at: payload.new?.started_at || new Date().toISOString(),
          status: 'active' as const,
          scriber_id: payload.new?.scriber_id || null,
        };
        broadcastFunctions.broadcastMeetingStarted(teamId, meetingType, meetingData);
      } else if (newStatus === 'ended' && broadcastFunctions?.broadcastMeetingEnded) {
        broadcastFunctions.broadcastMeetingEnded(teamId);
      }
    }

    // Force immediate cache invalidation and refetch
    if (user && currentCompany) {
      queryClient.invalidateQueries({
        queryKey: ['optimized-meetings-data', user.id, currentCompany?.id],
        refetchType: 'active' // Force immediate refetch
      });
    }

    // Trigger callback immediately
    onMeetingChange();

    return true; // Status change processed
  }, [onMeetingChange, queryClient, user, currentCompany, broadcastFunctions, teamIds]);

  // Smart immediate callback that skips cache invalidation during meeting transitions
  // FIXED: Only skip for OUR OWN meeting transitions, not updates from other users
  const immediateRefetch = useCallback((incomingMeetingId?: string) => {
    // Only skip if we're processing OUR OWN meeting transition
    const isOurOwnMeetingTransition = processingMeetingId && 
      (isEndingMeeting || isLeavingMeeting || isInProtectionPeriod()) &&
      incomingMeetingId === processingMeetingId;
    
    if (isOurOwnMeetingTransition) {
      return;
    }
    
    // Process updates from OTHER users immediately
    if (user && currentCompany) {
      queryClient.invalidateQueries({
        queryKey: ['optimized-meetings-data', user.id, currentCompany?.id],
        refetchType: 'active'
      });
    }
    
    onMeetingChange();
  }, [onMeetingChange, queryClient, user, currentCompany, isEndingMeeting, isLeavingMeeting, isInProtectionPeriod, processingMeetingId]);

  // Smart debounced callback that skips updates during meeting transitions
  // FIXED: Only skip for OUR OWN meeting transitions
  const debouncedRefetch = useCallback((incomingMeetingId?: string) => {
    // Only skip if we're processing OUR OWN meeting
    const isOurOwnMeetingTransition = processingMeetingId && 
      (isEndingMeeting || isLeavingMeeting || isInProtectionPeriod()) &&
      incomingMeetingId === processingMeetingId;
    
    if (isOurOwnMeetingTransition) {
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current > 500) {
        
        if (user && currentCompany) {
          queryClient.invalidateQueries({
            queryKey: ['optimized-meetings-data', user.id, currentCompany?.id],
            refetchType: 'none'
          });
        }
        
        onMeetingChange();
        lastUpdateRef.current = now;
      }
    }, 750);
  }, [onMeetingChange, queryClient, user, currentCompany, isEndingMeeting, isLeavingMeeting, isInProtectionPeriod, processingMeetingId]);

  useEffect(() => {
    if (!enabled || !currentCompany) {
      return;
    }

    // Single channel for all meeting-related changes with company filtering
    const meetingsChannel = supabase
      .channel(`optimized_meetings_${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meetings_state'
        },
        (payload) => {
          
          
          // ✅ CRITICAL: Check if new meeting belongs to current company
          // Support both direct company_id AND team_id fallback for legacy meetings
          const newCompanyId = payload.new?.company_id;
          const newTeamId = payload.new?.team_id;
          const meetingId = payload.new?.id;
          const meetingType = payload.new?.meeting_type;
          const newStatus = payload.new?.status;
          
          // Check via direct company_id match
          const belongsToCompanyDirectly = newCompanyId === currentCompany?.id;
          // Fallback 1: Check via team_id if company_id is null (legacy meetings)
          const belongsViaTeam = !newCompanyId && newTeamId && teamIds?.includes(newTeamId);
          // Fallback 2: Check via team_id even if company_id exists (for team meetings where company_id might not be set correctly)
          const belongsViaTeamId = newTeamId && teamIds?.includes(newTeamId);
          const belongsToCompany = belongsToCompanyDirectly || belongsViaTeam || belongsViaTeamId;
          
          if (belongsToCompany && newStatus === 'active') {
            
            // ✅ CRITICAL: Broadcast meeting_started on INSERT for instant sync
            // This ensures the /meetings page updates immediately for all users
            if (newTeamId && meetingType && broadcastFunctions?.broadcastMeetingStarted) {
              const meetingData = {
                id: meetingId,
                team_id: newTeamId,
                team_name: '', // Will be enriched by receiver's background refetch
                company_name: '', // Will be enriched by receiver's background refetch
                meeting_type: meetingType,
                current_section: payload.new?.current_section || 0,
                started_at: payload.new?.started_at || new Date().toISOString(),
                status: 'active' as const,
                scriber_id: payload.new?.scriber_id || null,
              };
              broadcastFunctions.broadcastMeetingStarted(newTeamId, meetingType, meetingData);
            }
            
            // Also trigger immediate refetch for local cache update
            immediateRefetch(meetingId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings_state'
        },
        (payload) => {
          
          
          // ✅ CRITICAL: Check for status changes first (active ↔ ended)
          const wasStatusChange = immediateStatusChangeRefetch(payload);
          
          if (wasStatusChange) {
            // Status change already handled, don't process further
            return;
          }
          
          // For other updates, use debounced refetch to prevent cascade during transitions
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'meetings_state'
        },
        (payload) => {
          
          
          // ✅ CRITICAL: Check if deleted meeting belonged to current company
          // Support both direct company_id AND team_id fallback for legacy meetings
          const oldCompanyId = payload.old?.company_id;
          const oldTeamId = payload.old?.team_id;
          const meetingId = payload.old?.id;
          
          const belongsToCompanyDirectly = oldCompanyId === currentCompany?.id;
          const belongsViaTeam = !oldCompanyId && oldTeamId && teamIds?.includes(oldTeamId);
          const belongsViaTeamId = oldTeamId && teamIds?.includes(oldTeamId);
          
          if (belongsToCompanyDirectly || belongsViaTeam || belongsViaTeamId) {
            immediateRefetch(meetingId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_results'
        },
        (payload) => {
          
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(meetingsChannel);
    };
  }, [currentCompany?.id, enabled, debouncedRefetch, immediateRefetch, immediateStatusChangeRefetch, teamIds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
};
